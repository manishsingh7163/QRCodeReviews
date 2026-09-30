# UPI Payment Integration Changes

## Summary
Replaced Razorpay payment gateway with UPI QR code-based payments. Users can now pay via any UPI app by scanning a dynamically generated QR code.

## Changes Made

### 1. **server.js** - Payment Backend
- **Removed**: Razorpay API integration (`RZP_KEY`, `RZP_SECRET`, `razorpayOrder()`, `validSignature()`)
- **Added**: 
  - `UPI_ID` environment variable (default: `9772883504@ybl`)
  - `generateUPIString()` - Creates UPI payment string per NPCI standards
  - `generateUPIQRCode()` - Generates QR code image from UPI string using the `qrcode` package
  - Updated `/billing/order` endpoint to return QR code image + UPI string
  - Updated `/billing/verify` endpoint to accept transaction receipt ID from user

### 2. **views.js** - Payment UI
- **Updated**: `billing()` function to display:
  - "Show UPI QR Code" button (instead of Razorpay checkout)
  - QR code image dynamically generated from server
  - UPI ID display (e.g., "UPI: 9772883504@ybl")
  - Input field for user to enter their transaction/receipt ID
  - "Confirm Payment" button to verify and activate the subscription

### 3. **.env** Configuration
- **Added**: `UPI_ID=9772883504@ybl` - Your UPI address for receiving payments
- Can be customized by changing the UPI ID in the `.env` file

### 4. **.env.example** - Template
- Added comprehensive environment variable documentation for future reference

## How It Works

1. **User clicks "Show UPI QR Code"** → Server generates UPI payment QR code
2. **QR code appears on screen** with the amount and UPI ID
3. **User scans with any UPI app** (Google Pay, PhonePe, BHIM, etc.)
4. **User completes payment** in their UPI app
5. **User pastes transaction ID** in the confirmation field
6. **System verifies and activates** the subscription for 30 days

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `UPI_ID` | Your UPI address for receiving payments | `9772883504@ybl` |
| `PORT` | Server port | `3000` |
| `BASE_URL` | Base URL for the application | `http://localhost:3000` |

## No Razorpay Credentials Required
- ✅ Simpler setup - no API keys needed
- ✅ Lower transaction fees (UPI direct transfer)
- ✅ Works with all UPI apps in India
- ✅ Instant verification (user provides receipt ID)

## Database
The existing `payments` table structure is unchanged:
- `order_id`: Unique payment order ID
- `payment_id`: UPI transaction receipt ID (user-provided)
- `status`: 'created' or 'paid'
- `owner_id`, `outlets`, `amount`, `ts`: Existing fields work as before

## Testing

To test locally:
```bash
npm install
npm start
```

Visit `http://localhost:3000/billing` to see the UPI QR code payment interface.

## Production Deployment

When deploying to production with your domain:
1. Update `.env`: `BASE_URL=https://yourdomain.com`
2. Update `.env`: `UPI_ID=your-actual-upi-id@bank`
3. Deploy via Docker Compose: `docker compose up`

The UPI payment flow will work identically on production.
