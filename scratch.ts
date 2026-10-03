  async confirmWalletPayment(paymentId: string): Promise<void> {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) return;
    await confirmPaidOrder(payment.razorpayOrderId, {
      razorpayPaymentId: `wallet_txn_${new Types.ObjectId()}`,
      razorpayStatus: 'captured',
    });
  },
