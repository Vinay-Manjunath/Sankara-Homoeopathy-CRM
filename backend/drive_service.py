import os
import cloudinary
import cloudinary.uploader

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

def upload_file_to_drive(file_stream, filename: str, mime_type: str):
    """
    Uploads patient reports, images, or PDFs to Cloudinary
    and returns an instant HTTPS link.
    """
    try:
        # Determine resource type: auto handles images, pdfs, videos, and raw docs
        res = cloudinary.uploader.upload(
            file_stream,
            public_id=f"sankara_clinic/{filename.rsplit('.', 1)[0]}",
            resource_type="auto",
            overwrite=True
        )
        return {
            "id": res.get("public_id"),
            "url": res.get("secure_url")  # Public HTTPS URL
        }
    except Exception as e:
        print(f"Cloudinary upload failed: {e}")
        return {
            "id": "upload_failed",
            "url": f"https://via.placeholder.com/150?text=Upload+Error"
        }