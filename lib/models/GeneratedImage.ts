import mongoose from 'mongoose';

const MODEL_NAME = 'GeneratedImage';

const generatedImageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    source: {
      type: String,
      enum: ['overlay', 'canva'],
      default: 'overlay',
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
      required: false,
    },
    templateExternalId: {
      type: String,
      required: false,
    },
    templateTitle: {
      type: String,
      required: false,
    },
    userImagePublicId: {
      type: String,
      required: false,
    },
    customText: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== 'production' && mongoose.models[MODEL_NAME]) {
  delete mongoose.models[MODEL_NAME];
}

export const GeneratedImage =
  mongoose.models[MODEL_NAME] || mongoose.model(MODEL_NAME, generatedImageSchema);
