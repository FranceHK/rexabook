-- Allow users to cancel their own pending SMS purchase requests.
ALTER TYPE "SmsPurchaseStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
