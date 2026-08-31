import os
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
from google.cloud import firestore

logger = logging.getLogger("kilimo_state_manager")

class KilimoStateManager:
    """Manages transactional state transitions and persistent memory in Cloud Firestore with resilient in-memory fallback."""
    
    def __init__(self, project_id: Optional[str] = None):
        raw_proj = project_id or os.getenv("GOOGLE_CLOUD_PROJECT", "kilimoagent")
        # Ensure clean single token project ID without whitespace or extra env var text
        self.project_id = str(raw_proj).strip().split()[0]
        self._in_memory_store: Dict[str, Any] = {}
        self.db = None
        self.collection = None
        
        try:
            self.db = firestore.Client(project=self.project_id)
            self.collection = self.db.collection("kilimo_transactions")
        except Exception as e:
            logger.warning(f"[Firestore Init Warning]: {e}. Operating with transactional in-memory store.")

    def initialize_transaction(
        self, 
        farmer_id: Optional[str] = None, 
        initial_payload: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, str]:
        """
        Creates a new transaction document checkpoint in Firestore or in-memory store.
        If farmer_id is omitted or empty, auto-generates a collision-resistant business ID.
        """
        import uuid
        tx_id = f"tx_{uuid.uuid4().hex[:12]}"

        if not farmer_id or not str(farmer_id).strip():
            final_farmer_id = f"FARMER-{tx_id[:8].upper()}"
        else:
            final_farmer_id = str(farmer_id).strip()

        doc_data = {
            "transaction_id": tx_id,
            "farmer_id": final_farmer_id,
            "status": "QUEUED",
            "initial_input": initial_payload or {},
            "execution_trace": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        if self.collection:
            try:
                doc_ref = self.collection.document(tx_id)
                doc_ref.set({
                    **doc_data,
                    "created_at": firestore.SERVER_TIMESTAMP,
                    "updated_at": firestore.SERVER_TIMESTAMP
                })
                return tx_id, final_farmer_id
            except Exception as e:
                logger.warning(f"[Firestore Write Fallback]: {e}")

        self._in_memory_store[tx_id] = doc_data
        return tx_id, final_farmer_id

    def update_stage(self, transaction_id: str, stage: str, details: Optional[Dict[str, Any]] = None):
        """Appends an execution step to the audit trace and updates transaction status."""
        if self.collection:
            try:
                doc_ref = self.collection.document(transaction_id)
                doc_ref.update({
                    "status": stage,
                    "execution_trace": firestore.ArrayUnion([{
                        "stage": stage,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "details": details or {}
                    }]),
                    "updated_at": firestore.SERVER_TIMESTAMP
                })
                return
            except Exception as e:
                logger.warning(f"[Firestore Update Fallback]: {e}")

        if transaction_id in self._in_memory_store:
            self._in_memory_store[transaction_id]["status"] = stage
            self._in_memory_store[transaction_id]["execution_trace"].append({
                "stage": stage,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "details": details or {}
            })

    def complete_transaction(self, transaction_id: str, final_report: Dict[str, Any]):
        """Marks the transaction as COMPLETED and stores the executive report."""
        if self.collection:
            try:
                doc_ref = self.collection.document(transaction_id)
                doc_ref.update({
                    "status": "COMPLETED",
                    "final_outcome": final_report,
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": firestore.SERVER_TIMESTAMP
                })
                return
            except Exception as e:
                logger.warning(f"[Firestore Complete Fallback]: {e}")

        if transaction_id in self._in_memory_store:
            self._in_memory_store[transaction_id]["status"] = "COMPLETED"
            self._in_memory_store[transaction_id]["final_outcome"] = final_report
            self._in_memory_store[transaction_id]["completed_at"] = datetime.now(timezone.utc).isoformat()

    def get_or_create_farmer(self, email: str, name: Optional[str] = None) -> Dict[str, Any]:
        """
        Retrieves or creates a unique farmer profile identified by email in Cloud Firestore.
        Generates a collision-resistant business ID like 'KM-FARMER-XXXXX'.
        """
        import uuid
        import re
        clean_email = str(email or "").strip().lower()
        if not clean_email or "@" not in clean_email:
            raise ValueError("Valid farmer email is required.")

        farmer_name = name or clean_email.split("@")[0].replace(".", " ").title()

        # In-memory lookup / store
        if not hasattr(self, "_farmers_store"):
            self._farmers_store: Dict[str, Dict[str, Any]] = {}

        # 1. Check Cloud Firestore
        if self.db:
            try:
                farmers_ref = self.db.collection("farmers")
                query = farmers_ref.where("email", "==", clean_email).limit(1).get()
                for doc in query:
                    f_data = doc.to_dict()
                    return {
                        "farmer_id": f_data.get("farmer_id", doc.id),
                        "email": clean_email,
                        "name": f_data.get("name", farmer_name),
                        "created_at": str(f_data.get("created_at", datetime.now(timezone.utc).isoformat())),
                        "is_new": False
                    }

                # Create new profile
                unique_suffix = uuid.uuid4().hex[:6].upper()
                new_farmer_id = f"KM-FARMER-{unique_suffix}"
                new_doc = {
                    "farmer_id": new_farmer_id,
                    "email": clean_email,
                    "name": farmer_name,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                farmers_ref.document(new_farmer_id).set({
                    **new_doc,
                    "created_at": firestore.SERVER_TIMESTAMP,
                    "updated_at": firestore.SERVER_TIMESTAMP
                })
                return {
                    "farmer_id": new_farmer_id,
                    "email": clean_email,
                    "name": farmer_name,
                    "created_at": new_doc["created_at"],
                    "is_new": True
                }
            except Exception as e:
                logger.warning(f"[Firestore Farmer Profile Fallback]: {e}")

        # 2. In-memory fallback
        for fid, f in self._farmers_store.items():
            if f.get("email") == clean_email:
                return { **f, "is_new": False }

        unique_suffix = uuid.uuid4().hex[:6].upper()
        new_farmer_id = f"KM-FARMER-{unique_suffix}"
        new_doc = {
            "farmer_id": new_farmer_id,
            "email": clean_email,
            "name": farmer_name,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        self._farmers_store[new_farmer_id] = new_doc
        return { **new_doc, "is_new": True }

    def link_transaction_to_farmer(
        self, 
        email: str, 
        transaction_id: str, 
        farmer_id: Optional[str] = None, 
        summary: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Links a completed dispatch transaction to a farmer's email and account in Firestore.
        """
        clean_email = str(email or "").strip().lower()
        farmer_profile = self.get_or_create_farmer(clean_email)
        f_id = farmer_id or farmer_profile["farmer_id"]

        now_iso = datetime.now(timezone.utc).isoformat()
        record = {
            "transaction_id": transaction_id,
            "farmer_id": f_id,
            "farmer_email": clean_email,
            "summary": summary or {},
            "timestamp": now_iso
        }

        # Save in Firestore subcollection / transactions index
        if self.db:
            try:
                # Update main transaction
                self.db.collection("kilimo_transactions").document(transaction_id).set({
                    "farmer_id": f_id,
                    "farmer_email": clean_email,
                    "updated_at": firestore.SERVER_TIMESTAMP
                }, merge=True)

                # Add to farmer history subcollection
                self.db.collection("farmers").document(f_id).collection("dispatches").document(transaction_id).set({
                    **record,
                    "timestamp": firestore.SERVER_TIMESTAMP
                })
            except Exception as e:
                logger.warning(f"[Firestore Link Transaction Fallback]: {e}")

        # In-memory history tracking
        if not hasattr(self, "_farmer_dispatches"):
            self._farmer_dispatches: Dict[str, list] = {}
        if f_id not in self._farmer_dispatches:
            self._farmer_dispatches[f_id] = []
        
        # Avoid duplicate entries
        existing_ids = [d.get("transaction_id") for d in self._farmer_dispatches[f_id]]
        if transaction_id not in existing_ids:
            self._farmer_dispatches[f_id].insert(0, record)

        return {
            "status": "LINKED",
            "farmer_id": f_id,
            "farmer_email": clean_email,
            "transaction_id": transaction_id
        }

    def get_farmer_history(
        self, 
        farmer_id: Optional[str] = None, 
        email: Optional[str] = None
    ) -> list:
        """
        Retrieves all past dispatches and waybills for a given farmer from Firestore.
        """
        clean_email = str(email or "").strip().lower() if email else None
        target_fid = farmer_id

        if not target_fid and clean_email:
            profile = self.get_or_create_farmer(clean_email)
            target_fid = profile.get("farmer_id")

        if not target_fid:
            return []

        history = []

        if self.db:
            try:
                docs = (
                    self.db.collection("farmers")
                    .document(target_fid)
                    .collection("dispatches")
                    .order_by("timestamp", direction=firestore.Query.DESCENDING)
                    .limit(50)
                    .get()
                )
                for doc in docs:
                    d_data = doc.to_dict()
                    ts = d_data.get("timestamp")
                    if hasattr(ts, "isoformat"):
                        ts_str = ts.isoformat()
                    else:
                        ts_str = str(ts or datetime.now(timezone.utc).isoformat())
                    d_data["timestamp"] = ts_str
                    history.append(d_data)
                if history:
                    return history
            except Exception as e:
                logger.warning(f"[Firestore History Query Fallback]: {e}")

        # In-memory fallback
        if hasattr(self, "_farmer_dispatches") and target_fid in self._farmer_dispatches:
            return self._farmer_dispatches[target_fid]

        return []