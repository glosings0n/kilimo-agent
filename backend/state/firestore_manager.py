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