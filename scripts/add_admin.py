#!/usr/bin/env python3
# /// script
# dependencies = [
#     "firebase-admin>=6.5.0",
# ]
# ///
"""
Utility script to grant admin access to a specific email address in Firestore.
Usage:
  uv run scripts/add_admin.py <email>

To target local emulator:
  export FIRESTORE_EMULATOR_HOST=localhost:8086
  uv run scripts/add_admin.py <email>
"""

import os
import sys
import argparse
import firebase_admin
from firebase_admin import credentials, firestore

def main():
    parser = argparse.ArgumentParser(description="Grant admin access to a specific email in Firestore.")
    parser.add_argument("email", help="The email address to grant admin access to.")
    args = parser.parse_args()

    email = args.email.strip().lower()
    if not email:
        print("Error: Email address cannot be empty.", file=sys.stderr)
        sys.exit(1)

    emulator_host = os.environ.get('FIRESTORE_EMULATOR_HOST')
    
    if emulator_host:
        print(f"Connecting to local Firestore emulator at {emulator_host}...")
        # For emulator, we bypass credential checks using google.auth.credentials.AnonymousCredentials.
        from google.auth.credentials import AnonymousCredentials
        
        class DummyCred(firebase_admin.credentials.Base):
            def __init__(self):
                super().__init__()
                self._g_credential = AnonymousCredentials()
            def get_credential(self):
                return self._g_credential
        
        firebase_admin.initialize_app(DummyCred(), options={'projectId': 'heji-study'})
    else:
        print("Connecting to production Firebase...")
        cred_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
        if not cred_path and os.path.exists('service-account.json'):
            cred_path = 'service-account.json'
        
        if cred_path:
            print(f"Using service account file: {cred_path}")
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            try:
                print("Attempting to use Application Default Credentials...")
                cred = credentials.ApplicationDefault()
                firebase_admin.initialize_app(cred)
            except Exception as e:
                print(f"\nError: Could not initialize Firebase Admin SDK: {e}", file=sys.stderr)
                print("\nTo target the local emulator, run:", file=sys.stderr)
                print("  export FIRESTORE_EMULATOR_HOST=localhost:8086", file=sys.stderr)
                print("  uv run scripts/add_admin.py <email>", file=sys.stderr)
                print("\nTo target production, please set GOOGLE_APPLICATION_CREDENTIALS or place 'service-account.json' in the repo root.", file=sys.stderr)
                sys.exit(1)


    db = firestore.client()
    
    # Write to the 'admins' collection with email as doc ID
    doc_ref = db.collection('admins').document(email)
    doc_ref.set({
        'email': email,
        'addedAt': firestore.SERVER_TIMESTAMP
    })
    
    print(f"Success: Added '{email}' to the 'admins' list in Firestore.")

if __name__ == "__main__":
    main()
