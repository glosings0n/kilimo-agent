import os
import json
import base64
import asyncio
from typing import Optional, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException, Request
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from agent import process_conversational_intake
from tools.multimodal_grading import validate_and_transcribe_voice_note
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
        "live_model": "gemini-3.1-flash-live-preview",
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
    Fallback REST Endpoint for Single-Turn Voice/Text/Image Queries.
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
    Native Gemini Live API Bidirectional Streaming Proxy Endpoint over WebSockets.
    Proxies 16kHz PCM audio & JPEG camera frames to Gemini 3.1 Flash Live,
    and returns low-latency 24kHz PCM audio & live transcriptions back to the browser.
    """
    await websocket.accept()
    session_id = f"ws_live_{id(websocket)}"
    
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    
    try:
        try:
            from google import genai
            from google.genai import types
        except ImportError:
            await websocket.send_json({"type": "error", "message": "google-genai SDK package is missing on server."})
            await websocket.close()
            return

        client = None
        if api_key:
            try:
                client = genai.Client(api_key=api_key)
            except Exception as err:
                client = None

        if not client:
            # Attempt fallback to Google Cloud Vertex AI ADC
            try:
                project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "kilimoagent")
                location = os.getenv("GEMINI_LOCATION", "us-central1")
                client = genai.Client(vertexai=True, project=project_id, location=location)
            except Exception as err:
                await websocket.send_json({
                    "type": "error", 
                    "message": f"GEMINI_API_KEY environment variable is not configured on server (or missing in backend/.env). Error: {str(err)}"
                })
                await websocket.close()
                return

        system_instruction = (
            "You are KilimoAgent, an empathetic, expert agricultural AI assistant serving smallholder farmers in East Africa. "
            "You speak naturally, warmly, and concisely in French, Swahili, or English depending on what language the user speaks. "
            "Your mission is to help farmers evaluate their harvested crops (maize, cassava, coffee, beans, tomatoes, etc.), "
            "estimate harvest volumes in KG or bags, suggest nearby high-paying depots or markets for arbitrage, and assist with freight dispatch. "
            "Keep your live spoken responses concise, friendly, and direct."
        )

        config = types.LiveConnectConfig(
            response_modalities=[types.Modality.AUDIO],
            system_instruction=types.Content(parts=[types.Part(text=system_instruction)]),
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig()
        )

        if api_key:
            model_candidates = [
                "gemini-3.1-flash-live-preview",
                "gemini-2.0-flash-exp",
                "gemini-2.0-flash"
            ]
        else:
            model_candidates = [
                "gemini-2.0-flash-exp",
                "gemini-2.0-flash"
            ]

        session_established = False
        last_err = None

        for model_name in model_candidates:
            try:
                print(f"[Gemini Live WS] Attempting connection with model candidate: '{model_name}' (using {'API Key' if api_key else 'Vertex AI ADC'})...")
                async with client.aio.live.connect(model=model_name, config=config) as session:
                    session_established = True
                    print(f"[Gemini Live WS] Successfully connected session with model: '{model_name}'")
                    
                    # Send initial greeting trigger to Gemini Live session
                    await session.send_realtime_input(
                        text="Bonjour KilimoAgent ! Salue chaleureusement le fermier en français et demande-lui comment tu peux l'aider avec ses récoltes."
                    )

                    # Notify client of successful connection with model name
                    await websocket.send_json({
                        "type": "connection_ack",
                        "status": "CONNECTED",
                        "session_id": session_id,
                        "model": model_name
                    })

                    async def forward_client_to_gemini():
                        """Reads WebSocket messages from React client and sends to Gemini Live session."""
                        silence_pcm = b"\x00" * 640  # 20ms of 16kHz 16-bit mono PCM silence
                        try:
                            while True:
                                try:
                                    data_text = await asyncio.wait_for(websocket.receive_text(), timeout=3.0)
                                except asyncio.TimeoutError:
                                    # Send 20ms silence keepalive ping to prevent Gemini 1011 keepalive ping timeout
                                    try:
                                        await session.send_realtime_input(
                                            audio=types.Blob(data=silence_pcm, mime_type="audio/pcm;rate=16000")
                                        )
                                    except Exception as ping_err:
                                        print(f"[Gemini Live Keepalive Ping Error]: {ping_err}")
                                    continue

                                if not data_text:
                                    continue
                                
                                try:
                                    payload = json.loads(data_text)
                                except Exception:
                                    continue

                                event_type = payload.get("type", "")

                                # Handle Heartbeat Ping from Frontend
                                if event_type == "ping":
                                    await websocket.send_json({"type": "pong"})
                                    continue

                                # 1. Handle 16kHz PCM Audio Stream
                                if event_type == "audio_pcm" or payload.get("audio_base64"):
                                    b64_audio = payload.get("audio_base64") or payload.get("data")
                                    if b64_audio:
                                        audio_bytes = base64.b64decode(b64_audio)
                                        await session.send_realtime_input(
                                            audio=types.Blob(data=audio_bytes, mime_type="audio/pcm;rate=16000")
                                        )

                                # 2. Handle JPEG Vision/Camera Frame
                                elif event_type == "image_frame" or payload.get("image_base64"):
                                    b64_img = payload.get("image_base64") or payload.get("data")
                                    if b64_img:
                                        img_bytes = base64.b64decode(b64_img)
                                        await session.send_realtime_input(
                                            video=types.Blob(data=img_bytes, mime_type="image/jpeg")
                                        )

                                # 3. Handle Text Input Message
                                elif event_type == "text_message" or payload.get("text"):
                                    user_text = payload.get("text") or payload.get("message")
                                    if user_text:
                                        await session.send_realtime_input(text=user_text)

                        except WebSocketDisconnect:
                            pass
                        except asyncio.CancelledError:
                            pass
                        except Exception as e:
                            print(f"[WS Forward Error]: {e}")

                    async def forward_gemini_to_client():
                        """Receives streaming events from Gemini Live session and sends to React client."""
                        try:
                            async for response in session.receive():
                                content = response.server_content
                                if not content:
                                    continue

                                # Audio response chunks (24kHz raw PCM)
                                if content.model_turn and content.model_turn.parts:
                                    for part in content.model_turn.parts:
                                        if part.inline_data and part.inline_data.data:
                                            pcm_b64 = base64.b64encode(part.inline_data.data).decode("utf-8")
                                            await websocket.send_json({
                                                "type": "audio_chunk",
                                                "data": pcm_b64,
                                                "mime_type": "audio/pcm;rate=24000"
                                            })

                                # Input transcription (Farmer speech)
                                if content.input_transcription and content.input_transcription.text:
                                    print(f"[Gemini Live Input Transcript]: {content.input_transcription.text}")
                                    await websocket.send_json({
                                        "type": "input_transcription",
                                        "text": content.input_transcription.text
                                    })

                                # Output transcription (Gemini speech)
                                if content.output_transcription and content.output_transcription.text:
                                    print(f"[Gemini Live Output Transcript]: {content.output_transcription.text}")
                                    await websocket.send_json({
                                        "type": "output_transcription",
                                        "text": content.output_transcription.text
                                    })

                                # User interrupted AI speech signal
                                if content.interrupted:
                                    print("[Gemini Live Interrupted]")
                                    await websocket.send_json({"type": "interrupted"})

                                # Turn completed
                                if content.turn_complete:
                                    print("[Gemini Live Turn Complete]")
                                    await websocket.send_json({"type": "turn_complete"})

                        except WebSocketDisconnect:
                            pass
                        except asyncio.CancelledError:
                            pass
                        except Exception as e:
                            print(f"[WS Receive Error]: {e}")

                    # Run both streaming tasks concurrently
                    task_fwd = asyncio.create_task(forward_client_to_gemini())
                    task_rev = asyncio.create_task(forward_gemini_to_client())

                    done, pending = await asyncio.wait(
                        [task_fwd, task_rev],
                        return_when=asyncio.FIRST_COMPLETED
                    )

                    for task in pending:
                        task.cancel()

                    break  # Successful session completed, exit candidate loop

            except Exception as err:
                err_msg = str(err)
                print(f"[Gemini Live WS] Model candidate '{model_name}' failed: {err_msg}")
                last_err = err
                if "was not found" in err_msg.lower() or "1008" in err_msg or "404" in err_msg:
                    continue  # Try next candidate
                else:
                    break

        if not session_established and last_err:
            err_text = str(last_err)
            if "BidiGenerateContent" in err_text or "blocked" in err_text.lower():
                user_msg = (
                    "L'accès WebSocket à Gemini Live (BidiGenerateContent) est bloqué par les restrictions de votre Clé API. "
                    "Pour corriger : Allez sur Google Cloud Console (APIs & Services > Credentials), éditez votre Clé API, "
                    "définissez 'Restrictions relatives aux API' sur 'Ne pas restreindre la clé' (Don't restrict key), puis enregistrez."
                )
            else:
                user_msg = f"Impossible d'établir une session Gemini Live. Erreur: {err_text}"

            await websocket.send_json({
                "type": "error",
                "message": user_msg
            })
            await websocket.close()

    except WebSocketDisconnect:
        print(f"[WS LIVE] Client disconnected: {session_id}")
    except Exception as e:
        print(f"[WS LIVE] Live Session Error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
