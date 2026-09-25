"""
Generates a VAPID key pair for Web Push and appends it to backend/.env.

Run once with:
    python -m app.generate_vapid
"""

from pathlib import Path

from cryptography.hazmat.primitives import serialization
from py_vapid import Vapid
from py_vapid.utils import b64urlencode

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


def main():
    existing = ENV_PATH.read_text() if ENV_PATH.exists() else ""
    if "VAPID_PRIVATE_KEY=" in existing:
        print(f"VAPID keys already present in {ENV_PATH}; leaving them unchanged.")
        return

    vapid = Vapid()
    vapid.generate_keys()

    private_key = b64urlencode(
        vapid.private_key.private_bytes(
            serialization.Encoding.DER,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    public_key = b64urlencode(
        vapid.public_key.public_bytes(
            serialization.Encoding.X962,
            serialization.PublicFormat.UncompressedPoint,
        )
    )

    with ENV_PATH.open("a") as env:
        if existing and not existing.endswith("\n"):
            env.write("\n")
        env.write(f"VAPID_PRIVATE_KEY={private_key}\n")
        env.write(f"VAPID_PUBLIC_KEY={public_key}\n")
        env.write("VAPID_SUBJECT=mailto:admin@example.com\n")

    print(f"VAPID keys written to {ENV_PATH}")


if __name__ == "__main__":
    main()
