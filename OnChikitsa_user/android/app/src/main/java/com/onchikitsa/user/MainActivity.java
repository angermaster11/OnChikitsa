package com.onchikitsa.user;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.razorpay.Checkout;
import com.razorpay.PaymentData;
import com.razorpay.PaymentResultWithDataListener;

/**
 * Razorpay's Android SDK delivers the checkout result to the ACTIVITY, so MainActivity
 * implements PaymentResultWithDataListener and forwards each outcome to
 * RazorpayNativePlugin (which resolves the pending JS call). The signature comes back
 * on PaymentData so the app can POST it to /user/payments/verify.
 */
public class MainActivity extends BridgeActivity implements PaymentResultWithDataListener {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // Register local plugins BEFORE the bridge is created (super.onCreate) so the
    // WebView can call them. RazorpayNative wraps Razorpay's native Checkout SDK.
    registerPlugin(RazorpayNativePlugin.class);
    super.onCreate(savedInstanceState);
    // Warm the SDK so the first checkout opens without a cold-start stall.
    Checkout.preload(getApplicationContext());
  }

  @Override
  public void onPaymentSuccess(String razorpayPaymentId, PaymentData paymentData) {
    RazorpayNativePlugin plugin = RazorpayNativePlugin.getInstance();
    if (plugin != null) {
      plugin.onCheckoutSuccess(
        razorpayPaymentId,
        paymentData != null ? paymentData.getOrderId() : null,
        paymentData != null ? paymentData.getSignature() : null
      );
    }
  }

  @Override
  public void onPaymentError(int code, String response, PaymentData paymentData) {
    RazorpayNativePlugin plugin = RazorpayNativePlugin.getInstance();
    if (plugin != null) {
      plugin.onCheckoutError(
        code,
        response,
        paymentData != null ? paymentData.getOrderId() : null,
        paymentData != null ? paymentData.getPaymentId() : null
      );
    }
  }
}
