// Private binary storage for payment proofs. The backend has no object-storage provider configured,
// and its serverless-style entrypoint has no persistent disk, so proofs live in MongoDB GridFS
// (chunked files in the existing database, bucket "paymentProofs"), not inline in documents.
// Files are only reachable through the authenticated /api/payment-proofs/:id/file route.
import mongoose from "mongoose";

const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "paymentProofs" });

export const storage = {
  async put(buffer, filename, metadata = {}) {
    const up = bucket().openUploadStream(filename, { metadata });
    await new Promise((resolve, reject) => {
      up.once("finish", resolve);
      up.once("error", reject);
      up.end(buffer);
    });
    return up.id;
  },
  openRead(fileId) {
    return bucket().openDownloadStream(new mongoose.Types.ObjectId(String(fileId)));
  },
  async remove(fileId) {
    try {
      await bucket().delete(new mongoose.Types.ObjectId(String(fileId)));
    } catch {
      /* best effort */
    }
  },
};
