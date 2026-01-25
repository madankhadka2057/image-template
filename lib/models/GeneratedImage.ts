import mongoose from 'mongoose';

const generatedImageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    finalImageUrl: {
      type: String,
      required: true,
    },
    finalImagePublicId: {
      type: String,
      required: true,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
      required: true,
    },
    userImagePublicId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const GeneratedImage =
  mongoose.models.GeneratedImage ||
  mongoose.model('GeneratedImage', generatedImageSchema);
