import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export interface WalletTransactionDoc extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  amountPaise: number;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const walletTransactionSchema = new Schema<WalletTransactionDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amountPaise: { type: Number, required: true },
    type: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
    description: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

walletTransactionSchema.index({ userId: 1, createdAt: -1 });

export const WalletTransaction: Model<WalletTransactionDoc> = model<WalletTransactionDoc>('WalletTransaction', walletTransactionSchema);
