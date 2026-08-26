import os
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
from google.cloud import firestore

class KilimoStateManager:
    """Manages transactional state transitions and persistent memory in Cloud Firestore."""
    
    def __init__(self, project_id: Optional[str] = None):
        self.project_id = project_id or os.getenv("GOOGLE_CLOUD_PROJECT", "kilimoagent")
        self.db = firestore.Client(project=self.project_id)
        self.collection = self.db.collection("kilimo_transactions")

    def initialize_transaction(
        self, 
        farmer_id: Optional[str] = None, 
        initial_payload: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, str]:
        """
        Creates a new transaction document checkpoint in Firestore.
        If farmer_id is omitted or empty, auto-generates a collision-resistant business ID.
        
        Returns:
            Tuple[transaction_id, final_farmer_id]
        """
        doc_ref = self.collection.document()
        tx_id = doc_ref.id

        # Autonomous Farmer ID generation based on the Firestore unique reference
        if not farmer_id or not str(farmer_id).strip():
            final_farmer_id = f"FARMER-{tx_id[:8].upper()}"
        else:
            final_farmer_id = str(farmer_id).strip()

        doc_ref.set({
            "transaction_id": tx_id,
            "farmer_id": final_farmer_id,
            "status": "QUEUED",
            "initial_input": initial_payload or {},
            "execution_trace": [],
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP
        })
        
        return tx_id, final_farmer_id

    def update_stage(self, transaction_id: str, stage: str, details: Optional[Dict[str, Any]] = None):
        """Appends an execution step to the audit trace and updates transaction status."""
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

    def complete_transaction(self, transaction_id: str, final_report: Dict[str, Any]):
        """Marks the transaction as COMPLETED and stores the executive report."""
        doc_ref = self.collection.document(transaction_id)
        doc_ref.update({
            "status": "COMPLETED",
            "final_outcome": final_report,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": firestore.SERVER_TIMESTAMP
        })