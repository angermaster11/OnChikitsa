package com.onchikitsa.user;

import android.text.TextUtils;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.razorpay.Checkout;

import org.json.JSONObject;

/**
 * Native Razorpay Checkout bridge. JS calls pay({ keyId, orderId, amountPaise,
 * currency, name, description, prefill }); we hand Razorpay's SDK an order-based
 * options object and it renders its OWN native checkout (UPI-app hand-off incl.
 * Google Pay / cards / netbanking) — no embedded WebView to dead-end in, which is
 * exactly what broke PayU here.
 *
 * Razorpay delivers the result to the ACTIVITY (PaymentResultWithDataListener), not
 * to this plugin, so MainActivity forwards it back through the instance handle set in
 * load(). Only one checkout runs at a time, so a single reference is safe. The call
 * resolves ONCE with { status: success|failed|cancelled } plus, on success, the
 * order/payment id + signature the app POSTs to /user/payments/verify.
 */
@CapacitorPlugin(name = "RazorpayNative")
public class RazorpayNativePlugin extends Plugin {

  private static RazorpayNativePlugin instance;

  private PluginCall pendingCall;
  private boolean settled;

  @Override
  public void load() {
    instance = this;
  }

  static RazorpayNativePlugin getInstance() {
    return instance;
  }

  @PluginMethod
  public void pay(PluginCall call) {
    final String keyId = call.getString("keyId");
    final String orderId = call.getString("orderId");
    final Integer amountPaise = call.getInt("amountPaise");
    if (TextUtils.isEmpty(keyId) || TextUtils.isEmpty(orderId) || amountPaise == null) {
      call.reject("Missing keyId/orderId/amountPaise");
      return;
    }

    try {
      JSObject prefill = call.getObject("prefill");
      JSONObject options = new JSONObject();
      options.put("key", keyId);
      options.put("order_id", orderId);
      options.put("amount", amountPaise.intValue()); // integer paise
      options.put("currency", call.getString("currency", "INR"));
      options.put("name", call.getString("name", "OnChikitsa"));
      String description = call.getString("description", "");
      if (!TextUtils.isEmpty(description)) options.put("description", description);
      if (prefill != null) {
        JSONObject pf = new JSONObject();
        String email = prefill.getString("email");
        String contact = prefill.getString("contact");
        if (!TextUtils.isEmpty(email)) pf.put("email", email);
        if (!TextUtils.isEmpty(contact)) pf.put("contact", contact);
        if (pf.length() > 0) options.put("prefill", pf);
      }

      this.pendingCall = call;
      this.settled = false;
      // The SDK's result fires long after open() returns (via the activity listener),
      // so keep the call alive and resolve it from onCheckout*().
      call.setKeepAlive(true);

      final JSONObject opts = options;
      getActivity().runOnUiThread(() -> {
        // open() runs on the UI thread AFTER pay() has returned, so the outer
        // try/catch cannot see a failure here. If we don't catch it ourselves the
        // pending call is never settled and the JS `await` hangs forever (the
        // "stuck on Waiting for payment…" bug) — so reject it explicitly.
        try {
          Checkout checkout = new Checkout();
          checkout.setKeyID(keyId);
          checkout.open(getActivity(), opts);
        } catch (Exception e) {
          rejectOnce("Could not open Razorpay checkout: " + e.getMessage());
        }
      });
    } catch (Exception e) {
      // Setup failed before the checkout was scheduled — settle the call directly
      // (pendingCall may not be set yet, so don't route through rejectOnce here).
      this.settled = true;
      this.pendingCall = null;
      call.setKeepAlive(false);
      call.reject("Could not open Razorpay checkout: " + e.getMessage());
    }
  }

  /** Called by MainActivity's onPaymentSuccess — carries the fields /verify needs. */
  void onCheckoutSuccess(String paymentId, String orderId, String signature) {
    JSObject r = new JSObject();
    r.put("status", "success");
    r.put("razorpayPaymentId", paymentId);
    r.put("razorpayOrderId", orderId);
    r.put("razorpaySignature", signature);
    resolveOnce(r);
  }

  /** Called by MainActivity's onPaymentError. Razorpay code 0 == user cancelled. */
  void onCheckoutError(int code, String description, String orderId, String paymentId) {
    JSObject r = new JSObject();
    r.put("status", code == Checkout.PAYMENT_CANCELED ? "cancelled" : "failed");
    r.put("code", code);
    r.put("message", description);
    if (!TextUtils.isEmpty(orderId)) r.put("razorpayOrderId", orderId);
    if (!TextUtils.isEmpty(paymentId)) r.put("razorpayPaymentId", paymentId);
    resolveOnce(r);
  }

  private synchronized void resolveOnce(JSObject r) {
    if (settled || pendingCall == null) return;
    settled = true;
    pendingCall.resolve(r);
    pendingCall.setKeepAlive(false);
    pendingCall = null;
  }

  /** Settle the pending call with an error exactly once (e.g. open() threw). */
  private synchronized void rejectOnce(String message) {
    if (settled || pendingCall == null) return;
    settled = true;
    PluginCall call = pendingCall;
    pendingCall = null;
    call.setKeepAlive(false);
    call.reject(message);
  }
}
