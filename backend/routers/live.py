import os
import json
import base64
import asyncio
from typing import Optional, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException, Request
from pydantic import BaseModel

from agent import process_conversational_intake
from tools.multimodal_grading import validate_and_transcribe_voice_note, grade_and_validate_harvest_image
from config.models import MODEL_CONFIG

router = APIRouter()


class LiveChatRequest(BaseModel):
    session_id: Optional[str] = "live_session_1"
    user_id: Optional[str] = "live_farmer"
    message: Optional[str] = ""
    current_params: Optional[Dict[str, Any]] = None
    lang: Optional[str] = "en"


@router.get("/config")
def get_live_config():
    """Returns Gemini Live connection parameters, supported modalities, and model config."""
    return {
        "status": "ONLINE",
        "live_model": MODEL_CONFIG["live_model"],
        "supported_modalities": ["audio/pcm", "audio/webm", "image/jpeg", "text/plain"],
        "supported_languages": ["fr", "sw", "en"],
        "features": {
            "bidirectional_voice": True,
            "realtime_vision_grading": True,
            "instant_arbitrage_handoff": True,
            "websocket_streaming": True
        }
    }


@router.post("/chat")
async def live_stream_chat(
    request: Request,
    message: Optional[str] = Form(None),
    session_id: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None),
    lang: Optional[str] = Form(None),
    current_params: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None)
):
    """
    Bidirectional Live Streaming Endpoint (Supports JSON and Multipart FormData with audio/image uploads).
    """
    target_msg = ""
    target_session_id = "live_session_1"
    target_user_id = "live_farmer"
    target_lang = "en"
    target_params = {}
    audio_bytes = None
    image_bytes = None

    content_type = request.headers.get("content-type", "")

    if "application/json" in content_type:
        try:
            body = await request.json()
            target_msg = body.get("message", "")
            target_session_id = body.get("session_id", "live_session_1")
            target_user_id = body.get("user_id", "live_farmer")
            target_lang = body.get("lang") or body.get("preferred_language") or "en"
            target_params = body.get("current_params") or {}
        except Exception:
            pass
    else:
        target_msg = message or ""
        target_session_id = session_id or "live_session_1"
        target_user_id = user_id or "live_farmer"
        target_lang = lang or "en"
        
        if current_params and str(current_params).strip():
            try:
                target_params = json.loads(current_params)
            except Exception:
                target_params = {}

        if audio and audio.filename:
            raw_audio = await audio.read()
            if len(raw_audio) > 0:
                audio_bytes = raw_audio

        if image and image.filename:
            raw_img = await image.read()
            if len(raw_img) > 0:
                image_bytes = raw_img

    try:
        result = await process_conversational_intake(
            user_id=target_user_id,
            session_id=target_session_id,
            message=target_msg,
            current_params=target_params,
            image_source=image_bytes,
            audio_source=audio_bytes,
            preferred_language=target_lang,
            execute_on_ready=False
        )
        return {
            "success": True,
            "session_id": target_session_id,
            "reply": result.get("reply", ""),
            "speech_text": result.get("reply", ""),
            "intent": result.get("intent", ""),
            "action": result.get("action", "NORMAL"),
            "is_terminated": bool(result.get("is_terminated", False)),
            "detected_language": result.get("detected_language", target_lang),
            "extracted_params": result.get("extracted_params", {}),
            "missing_fields": result.get("missing_fields", []),
            "genui_widgets": result.get("genui_widgets", []),
            "is_ready": result.get("is_ready", False)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/ws")
async def live_websocket_endpoint(websocket: WebSocket):
    """
    Real-Time Gemini Live Bidirectional WebSocket Endpoint.
    Receives incoming audio/text/image frames and streams back live transcriptions & AI responses.
    """
    await websocket.accept()
    session_id = f"ws_live_{id(websocket)}"
    user_id = "ws_farmer"
    active_params = {}
    preferred_lang = "en"

    # Send initial connection acknowledgment
    await websocket.send_json({
        "type": "connection_ack",
        "status": "CONNECTED",
        "session_id": session_id,
        "model": MODEL_CONFIG["live_model"]
    })

    try:
        while True:
            data = await websocket.receive_text()
            if not data:
                continue

            try:
                payload = json.loads(data)
            except Exception:
                await websocket.send_json({"type": "error", "message": "Invalid JSON format"})
                continue

            event_type = payload.get("type", "text_message")
            user_lang = payload.get("lang", preferred_lang)
            if user_lang:
                preferred_lang = user_lang

            if payload.get("current_params"):
                active_params.update(payload["current_params"])

            audio_bytes = None
            image_bytes = None
            user_text = payload.get("text") or payload.get("message") or ""

            # 1. Handle base64 audio payload
            if event_type in ["audio_chunk", "audio_end"] or payload.get("audio_base64"):
                b64_data = payload.get("audio_base64") or payload.get("data")
                if b64_data:
                    try:
                        audio_bytes = base64.b64decode(b64_data)
                    except Exception as e:
                        print(f"[WS LIVE] Base64 audio decode error: {e}")

            # 2. Handle base64 image payload
            if event_type == "image_frame" or payload.get("image_base64"):
                b64_img = payload.get("image_base64") or payload.get("data")
                if b64_img:
                    try:
                        image_bytes = base64.b64decode(b64_img)
                    except Exception as e:
                        print(f"[WS LIVE] Base64 image decode error: {e}")

            # If audio is present, run real-time audio transcription feedback first
            if audio_bytes and len(audio_bytes) >= 100:
                transcription_res = validate_and_transcribe_voice_note(audio_bytes, lang=preferred_lang)
                if transcription_res.get("is_valid_speech"):
                    transcribed_text = transcription_res.get("transcript", "")
                    user_text = (user_text + " " + transcribed_text).strip()
                    await websocket.send_json({
                        "type": "speech_transcription",
                        "text": transcribed_text,
                        "detected_language": transcription_res.get("detected_language", preferred_lang)
                    })

            # Process intake triage
            res = await process_conversational_intake(
                user_id=user_id,
                session_id=session_id,
                message=user_text,
                current_params=active_params,
                image_source=image_bytes,
                audio_source=audio_bytes,
                preferred_language=preferred_lang,
                execute_on_ready=False
            )

            if res.get("extracted_params"):
                active_params.update(res["extracted_params"])

            # Send back structured AI response
            await websocket.send_json({
                "type": "ai_response",
                "reply": res.get("reply", ""),
                "speech_text": res.get("reply", ""),
                "intent": res.get("intent", ""),
                "action": res.get("action", "NORMAL"),
                "is_terminated": bool(res.get("is_terminated", False)),
                "detected_language": res.get("detected_language", preferred_lang),
                "extracted_params": res.get("extracted_params", {}),
                "missing_fields": res.get("missing_fields", []),
                "genui_widgets": res.get("genui_widgets", []),
                "is_ready": res.get("is_ready", False)
            })

    except WebSocketDisconnect:
        print(f"[WS LIVE] Client disconnected: {session_id}")
    except Exception as e:
        print(f"[WS LIVE] Connection error: {e}")
