// ============================================
// controllers/pesapalController.js
// ============================================

const pesapalService = require('../services/pesapalService');
const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const models = initModels(sequelize);

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Initiate Pesapal payment for an order
 * POST /api/v1/payments/pesapal/initiate
 */
exports.initiatePayment = async (req, res) => {
  try {
    const { order_id, callback_url, customer_email, customer_phone } = req.body;

    if (!order_id) {
      return res.status(400).json({ 
        error: 'Order ID is required' 
      });
    }

    // Fetch order details
    const order = await models.orders.findByPk(order_id, {
      include: [
        {
          model: models.users,
          as: 'customer',
          attributes: ['user_id', 'first_name', 'last_name', 'email', 'phone_number']
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Authorization check (allow if guest or owner)
    if (req.user && order.customer_id && order.customer_id !== req.user.account_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if order is already paid
    if (order.payment_status === 'paid' || order.payment_status === 'completed') {
      return res.status(400).json({ 
        error: 'Order is already paid',
        order_status: order.order_status,
        payment_status: order.payment_status
      });
    }

    // Check if order is cancelled
    if (order.order_status === 'canceled' || order.order_status === 'cancelled') {
      return res.status(400).json({ 
        error: 'Cannot process payment for cancelled order' 
      });
    }

    // ✅ Accept DRAFT orders for payment
    if (!['draft', 'pending'].includes(order.order_status)) {
      return res.status(400).json({
        error: `Cannot initiate payment for order with status: ${order.order_status}`,
      });
    }

    // Prepare billing address
    const billingAddress = {
      email_address: order.customer?.email || req.body.email || 'customer@example.com',
      phone_number: order.delivery_contact || order.customer?.phone_number || req.body.phone,
      first_name: order.customer?.first_name || 'Customer',
      last_name: order.customer?.last_name || 'User',
      country_code: 'KE',
      line_1: order.delivery_address || '',
      city: req.body.city || 'Nairobi',
      state: req.body.state || '',
      postal_code: req.body.postal_code || '',
      zip_code: req.body.zip_code || ''
    };

    // Validate required billing info
    if (!billingAddress.email_address || !billingAddress.phone_number) {
      return res.status(400).json({
        error: 'Customer email and phone number are required',
        details: 'Please provide email and phone in request body'
      });
    }

    // Prepare payment data
    const paymentData = {
      id: order.order_number || `ORD-${order.order_id}`,
      currency: 'KES',
      amount: order.total_amount,
      description: `Payment for Order ${order.order_number || order.order_id}`,
      callbackUrl: callback_url || `${process.env.API_BASE_URL}/api/v1/payments/pesapal/callback`,
      billingAddress
    };

    if (isDevelopment) {
      console.log('💳 Initiating Pesapal payment:', {
        order_id: order.order_id,
        order_number: order.order_number,
        amount: paymentData.amount,
        customer: `${billingAddress.first_name} ${billingAddress.last_name}`
      });
    }

    // Process payment with Pesapal
    const paymentResponse = await pesapalService.processPayment(paymentData);

    if (!paymentResponse.success || !paymentResponse.redirectUrl) {
      throw new Error('Failed to get payment redirect URL');
    }

    // Create payment transaction record
    await models.payment_transactions.create({
      order_id: order.order_id,
      payment_method_id: null, // Will be updated after payment
      transaction_id: paymentResponse.orderTrackingId,
      amount: order.total_amount,
      currency: 'KES',
      payment_status: 'pending',
      gateway: 'pesapal',
      gateway_reference: paymentResponse.merchantReference,
      created_at: new Date()
    });

    // Update order payment status
    await order.update({
      payment_status: 'pending'
    });

    console.log(`✅ Payment initiated for order ${order.order_number}`);

    res.json({
      success: true,
      message: 'Payment initiated successfully',
      payment: {
        order_id: order.order_id,
        order_number: order.order_number,
        amount: order.total_amount,
        currency: 'KES',
        order_tracking_id: paymentResponse.orderTrackingId,
        merchant_reference: paymentResponse.merchantReference,
        redirect_url: paymentResponse.redirectUrl
      }
    });

  } catch (err) {
    console.error('❌ Payment initiation error:', err);
    res.status(500).json({
      error: 'Failed to initiate payment',
      ...(isDevelopment && { details: err.message })
    });
  }
};

/**
 * Handle Pesapal callback after payment
 * GET /api/v1/payments/pesapal/callback
 */
exports.handleCallback = async (req, res) => {
  try {
    const { OrderTrackingId, OrderMerchantReference } = req.query;

    if (!OrderTrackingId || !OrderMerchantReference) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Payment Error</title></head>
          <body>
            <h1>❌ Payment Error</h1>
            <p>Invalid callback parameters</p>
          </body>
        </html>
      `);
    }

    if (isDevelopment) {
      console.log('📥 Pesapal callback received:', {
        OrderTrackingId,
        OrderMerchantReference
      });
    }

    // Verify payment status with Pesapal
    const paymentStatus = await pesapalService.queryPaymentStatus(OrderTrackingId);

    if (isDevelopment) {
      console.log('Payment status:', paymentStatus.paymentStatusDescription);
    }

    // Find the order using merchant reference (order_number)
    const order = await models.orders.findOne({
      where: { order_number: OrderMerchantReference }
    });

    if (!order) {
      console.error('Order not found for merchant reference:', OrderMerchantReference);
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Order Not Found</title></head>
          <body>
            <h1>⚠️ Order Not Found</h1>
            <p>Order reference: ${OrderMerchantReference}</p>
          </body>
        </html>
      `);
    }

    // Update payment transaction
    await models.payment_transactions.update(
      {
        payment_status: paymentStatus.isPaid ? 'completed' : 
                       paymentStatus.isFailed ? 'failed' : 'pending',
        transaction_id: paymentStatus.confirmationCode || OrderTrackingId,
        response_data: JSON.stringify(paymentStatus),
        updated_at: new Date()
      },
      {
        where: { 
          order_id: order.order_id,
          transaction_id: OrderTrackingId
        }
      }
    );

    // Update order payment status
    if (paymentStatus.isPaid) {
      await order.update({
        payment_status: 'paid',
        order_status: order.order_status === 'pending' ? 'confirmed' : order.order_status
      });

      console.log(`✅ Payment completed for order ${order.order_number}`);

      // Redirect to success page
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payment Successful</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                background: white;
                padding: 2rem;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 400px;
              }
              .success-icon {
                font-size: 64px;
                margin-bottom: 1rem;
              }
              h1 { color: #10b981; margin: 0 0 1rem 0; }
              p { color: #6b7280; margin: 0.5rem 0; }
              .order-info {
                background: #f3f4f6;
                padding: 1rem;
                border-radius: 8px;
                margin: 1rem 0;
              }
              .order-info p { margin: 0.25rem 0; font-size: 14px; }
              .button {
                display: inline-block;
                margin-top: 1.5rem;
                padding: 0.75rem 1.5rem;
                background: #667eea;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success-icon">✅</div>
              <h1>Payment Successful!</h1>
              <p>Your payment has been processed successfully.</p>
              <div class="order-info">
                <p><strong>Order Number:</strong> ${order.order_number}</p>
                <p><strong>Amount:</strong> KES ${order.total_amount.toFixed(2)}</p>
                <p><strong>Transaction ID:</strong> ${paymentStatus.confirmationCode || 'Pending'}</p>
              </div>
              <a href="${process.env.FRONTEND_URL || '/'}/orders/${order.order_id}" class="button">
                View Order
              </a>
            </div>
          </body>
        </html>
      `);
    } else if (paymentStatus.isFailed) {
      await order.update({ payment_status: 'failed' });

      console.log(`❌ Payment failed for order ${order.order_number}`);

      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payment Failed</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #f87171 0%, #dc2626 100%);
              }
              .container {
                background: white;
                padding: 2rem;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 400px;
              }
              .error-icon {
                font-size: 64px;
                margin-bottom: 1rem;
              }
              h1 { color: #dc2626; margin: 0 0 1rem 0; }
              p { color: #6b7280; margin: 0.5rem 0; }
              .button {
                display: inline-block;
                margin-top: 1.5rem;
                padding: 0.75rem 1.5rem;
                background: #dc2626;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error-icon">❌</div>
              <h1>Payment Failed</h1>
              <p>${paymentStatus.message || 'Your payment could not be processed.'}</p>
              <p>Please try again or contact support.</p>
              <a href="${process.env.FRONTEND_URL || '/'}/orders/${order.order_id}" class="button">
                Retry Payment
              </a>
            </div>
          </body>
        </html>
      `);
    } else {
      // Payment pending
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payment Pending</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
              }
              .container {
                background: white;
                padding: 2rem;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 400px;
              }
              .pending-icon {
                font-size: 64px;
                margin-bottom: 1rem;
              }
              h1 { color: #f59e0b; margin: 0 0 1rem 0; }
              p { color: #6b7280; margin: 0.5rem 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="pending-icon">⏳</div>
              <h1>Payment Pending</h1>
              <p>Your payment is being processed.</p>
              <p>Please wait for confirmation.</p>
            </div>
          </body>
        </html>
      `);
    }

  } catch (err) {
    console.error('❌ Callback handling error:', err);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Error</title></head>
        <body>
          <h1>❌ Error Processing Payment</h1>
          <p>An error occurred while processing your payment.</p>
          <p>Please contact support with reference: ${req.query.OrderMerchantReference}</p>
        </body>
      </html>
    `);
  }
};

/**
 * Handle Pesapal IPN (Instant Payment Notification)
 * POST /api/v1/payments/pesapal/ipn
 */
exports.handleIPN = async (req, res) => {
  try {
    const { OrderTrackingId, OrderMerchantReference } = req.body || req.query;

    if (!OrderTrackingId || !OrderMerchantReference) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (isDevelopment) {
      console.log('📨 IPN notification received:', {
        OrderTrackingId,
        OrderMerchantReference
      });
    }

    // Verify the IPN with Pesapal
    const paymentStatus = await pesapalService.verifyIPNCallback(
      OrderTrackingId,
      OrderMerchantReference
    );

    // Find and update the order
    const order = await models.orders.findOne({
      where: { order_number: OrderMerchantReference }
    });

    if (order) {
      if (paymentStatus.isPaid) {
        await order.update({
          payment_status: 'paid',
          order_status: order.order_status === 'pending' ? 'confirmed' : order.order_status
        });

        // Update payment transaction
        await models.payment_transactions.update(
          {
            payment_status: 'completed',
            transaction_id: paymentStatus.confirmationCode || OrderTrackingId,
            response_data: JSON.stringify(paymentStatus)
          },
          {
            where: { 
              order_id: order.order_id,
              gateway: 'pesapal'
            }
          }
        );

        console.log(`✅ IPN processed: Order ${order.order_number} marked as paid`);
      }
    }

    // Acknowledge IPN receipt
    res.status(200).json({ status: 'success' });

  } catch (err) {
    console.error('❌ IPN handling error:', err);
    res.status(500).json({ error: 'Failed to process IPN' });
  }
};

/**
 * Check payment status
 * GET /api/v1/payments/pesapal/status/:orderTrackingId
 */
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { orderTrackingId } = req.params;

    if (!orderTrackingId) {
      return res.status(400).json({ error: 'Order tracking ID is required' });
    }

    const paymentStatus = await pesapalService.queryPaymentStatus(orderTrackingId);

    res.json({
      success: true,
      payment_status: {
        order_tracking_id: paymentStatus.orderTrackingId,
        merchant_reference: paymentStatus.merchantReference,
        amount: paymentStatus.amount,
        currency: paymentStatus.currency,
        status: paymentStatus.paymentStatusDescription,
        payment_method: paymentStatus.paymentMethod,
        payment_account: paymentStatus.paymentAccount,
        confirmation_code: paymentStatus.confirmationCode,
        created_date: paymentStatus.createdDate,
        is_paid: paymentStatus.isPaid,
        is_pending: paymentStatus.isPending,
        is_failed: paymentStatus.isFailed
      }
    });

  } catch (err) {
    console.error('❌ Status check error:', err);
    res.status(500).json({
      error: 'Failed to check payment status',
      ...(isDevelopment && { details: err.message })
    });
  }
};

/**
 * Register IPN URL (Admin only)
 * POST /api/v1/payments/pesapal/register-ipn
 */
exports.registerIPN = async (req, res) => {
  try {
    const { ipn_url, notification_type } = req.body;

    if (!ipn_url) {
      return res.status(400).json({ error: 'IPN URL is required' });
    }

    const result = await pesapalService.registerIPN(
      ipn_url,
      notification_type || 'GET'
    );

    res.json({
      success: true,
      message: 'IPN registered successfully',
      ipn: result
    });

  } catch (err) {
    console.error('❌ IPN registration error:', err);
    res.status(500).json({
      error: 'Failed to register IPN',
      ...(isDevelopment && { details: err.message })
    });
  }
};

module.exports = exports;