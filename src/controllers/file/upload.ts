import cloudinary from "../../config/cloudinary";
import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../../errors";
import streamifier from "streamifier";
import { Transform } from "stream";
import { Request, Response } from "express";

interface CloudinaryUploadResult {
  secure_url: string;
  // Add other properties as needed
}

const uploadMedia = async (req: Request, res: Response): Promise<void> => {
  if (!req.file || !req.body.mediaType) {
    throw new BadRequestError("No file or media type provided");
  }

  try {
    const mediaType = req.body.mediaType;

    let folder: string;
    if (mediaType === "user_image") {
      folder = "user_images";
    } else if (mediaType === "reel_thumbnail") {
      folder = "reel_thumbnails";
    } else if (mediaType === "reel_video") {
      folder = "reel_videos";
    } else {
      throw new BadRequestError("Invalid media type");
    }

    const streamUpload = (req: Request): Promise<CloudinaryUploadResult> => {
      return new Promise((resolve, reject) => {
        let uploadedBytes = 0;
        const totalBytes = req.file!.size;

        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            use_filename: false,
            unique_filename: false,
            overwrite: false,
            resource_type: mediaType === "reel_video" ? "video" : "image",
          },
          (error, result) => {
            if (result) {
              console.log(result);
              resolve(result as CloudinaryUploadResult);
            } else {
              console.log(error);
              reject(error);
            }
          }
        );

        const progressStream = new Transform({
          transform(chunk: Buffer, encoding: string, callback: Function) {
            uploadedBytes += chunk.length;
            const progress = (uploadedBytes / totalBytes) * 100;
            console.log(`Upload progress: ${progress.toFixed(2)}%`);
            callback(null, chunk);
          },
        });

        streamifier
          .createReadStream(req.file!.buffer)
          .pipe(progressStream)
          .pipe(uploadStream);
      });
    };

    const result = await streamUpload(req);

    res.status(StatusCodes.OK).json({ mediaUrl: result.secure_url });
  } catch (error) {
    console.error(error);
    throw new BadRequestError("Media upload failed");
  }
};

export { uploadMedia };
