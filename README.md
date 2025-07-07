# QR Generator Pro - Full Stack Application

A comprehensive QR code generator with advanced features including customization, analytics, security, and tracking.

## 🌟 Features

### Backend Features

- **User Authentication**: JWT-based secure authentication
- **QR Code Generation**: Support for multiple QR types (URL, Text, vCard, WiFi, Email, SMS, Location, Calendar)
- **Advanced Customization**: Colors, logos, margins
- **Security Features**: Password protection, expiration dates, scan limits
- **Analytics & Tracking**: Detailed scan analytics with geolocation
- **File Management**: Logo upload and processing with Jimp
- **Database**: MongoDB with Mongoose ODM

### Frontend Features

- **Modern UI**: React 18 with Tailwind CSS
- **Authentication**: Protected routes and user management
- **QR Generation**: Intuitive form-based QR creation
- **History Management**: View, filter, and manage QR codes
- **Dashboard**: Analytics overview and quick actions
- **Responsive Design**: Works on all device sizes
- **Dark Mode**: Support for dark/light themes

## 🛠️ Technology Stack

### Backend

- **Framework**: Express.js (Node.js)
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **QR Generation**: qrcode library with Jimp
- **Security**: bcryptjs for password hashing
- **Analytics**: geoip-lite for location tracking

### Frontend

- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM v7
- **State Management**: React Context API
- **UI Components**: Custom components with React Icons
- **Charts**: Chart.js with react-chartjs-2
- **Notifications**: react-hot-toast

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

## 🚀 Installation & Setup

### 1. Clone the Repository

\`\`\`bash
git clone <repository-url>
cd Aspar
\`\`\`

### 2. Install Dependencies

\`\`\`bash

# Install root dependencies (for running both apps)

npm install

# Install all dependencies for both frontend and backend

npm run install:all
\`\`\`

### 3. Environment Configuration

#### Backend (.env)

Create a \`backend/.env\` file with:
\`\`\`env
PORT=5000
MONGODB_URI=mongodb+srv://your-mongodb-connection-string
JWT_SECRET=your-secret-key-here
FRONTEND_URL=http://localhost:5173
\`\`\`

#### Frontend (.env)

The frontend \`.env\` is already configured:
\`\`\`env
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=QR Generator Pro
\`\`\`

### 4. Database Setup

Make sure your MongoDB instance is running and accessible via the connection string in your backend \`.env\` file.

### 5. Start the Application

#### Development Mode (Both Apps)

\`\`\`bash
npm run dev
\`\`\`
This will start:

- Backend on http://localhost:5000
- Frontend on http://localhost:5173

#### Individual Apps

\`\`\`bash

# Backend only

npm run dev:backend

# Frontend only

npm run dev:frontend
\`\`\`

### 6. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## 📡 API Endpoints

### Authentication

- \`POST /api/auth/register\` - User registration
- \`POST /api/auth/login\` - User login
- \`GET /api/auth/me\` - Get current user

### QR Codes

- \`GET /api/qrcodes\` - Get all user QR codes
- \`POST /api/qrcodes\` - Create new QR code
- \`GET /api/qrcodes/:id\` - Get specific QR code
- \`DELETE /api/qrcodes/:id\` - Delete QR code
- \`POST /api/qrcodes/upload-logo\` - Upload logo

### Analytics

- \`GET /api/analytics/dashboard\` - Dashboard analytics
- \`GET /api/analytics/track/:qrCodeId/:trackingId\` - Track QR scan
- \`POST /api/analytics/verify-password/:qrCodeId\` - Verify password

### Tracking

- \`GET /track/:qrCodeId\` - QR code redirect with tracking

## 🎯 Usage

### 1. User Registration/Login

- Register a new account or login with existing credentials
- JWT tokens are automatically managed

### 2. Generate QR Codes

- Navigate to "Generate QR Code"
- Select QR type (URL, Text, vCard, etc.)
- Fill in the required fields
- Customize appearance (colors, logo, margin)
- Set security options (password, expiry, scan limits)
- Generate and download

### 3. Manage QR Codes

- View all QR codes in "History"
- Filter by type or search
- Download in different formats
- Delete unwanted QR codes
- View scan analytics

### 4. Analytics Dashboard

- View overall statistics
- See recent activity
- Track QR code performance
- Monitor scan counts and trends

## 🔒 Security Features

- **Password Protection**: QR codes can be password protected
- **Expiration Dates**: Set automatic expiry for QR codes
- **Scan Limits**: Limit the number of scans per QR code
- **User Authentication**: Secure JWT-based authentication
- **Input Validation**: All inputs are validated and sanitized

## 📊 Analytics Features

- **Scan Tracking**: Real-time scan counting
- **Geolocation**: Track scan locations (country/city)
- **Device Information**: Browser and device analytics
- **Time Tracking**: When scans occurred
- **Dashboard Metrics**: Comprehensive analytics dashboard

## 🛠️ Development

### Project Structure

\`\`\`
Aspar/
├── backend/ # Express.js backend
│ ├── models/ # Mongoose models
│ ├── routes/ # API routes
│ ├── middleware/ # Custom middleware
│ ├── utils/ # Utility functions
│ ├── uploads/ # File uploads
│ └── public/ # Static files
├── frontend/ # React frontend
│ ├── src/
│ │ ├── components/ # Reusable components
│ │ ├── pages/ # Page components
│ │ ├── hooks/ # Custom hooks
│ │ ├── utils/ # Utility functions
│ │ └── layouts/ # Layout components
│ └── public/ # Static assets
└── package.json # Root package.json
\`\`\`

### Adding New QR Types

1. Update the backend QR type enum in \`models/QRCode.js\`
2. Add formatting logic in \`utils/qrTypeFormatter.js\`
3. Update frontend form fields in \`pages/GenerateQR.jsx\`
4. Add validation logic as needed

### Customizing UI

- Modify Tailwind classes in components
- Update theme colors in \`tailwind.config.js\`
- Add new components in \`src/components/\`

## 🚀 Deployment

### Backend Deployment

1. Set production environment variables
2. Deploy to your preferred platform (Heroku, Railway, etc.)
3. Update CORS origins for production frontend URL

### Frontend Deployment

1. Update API URL in production environment
2. Build the application: \`npm run build\`
3. Deploy to Netlify, Vercel, or similar platform

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:

1. Check the console logs for errors
2. Verify environment variables are set correctly
3. Ensure MongoDB connection is working
4. Check that all dependencies are installed

## 🎉 Success!

Your QR Generator Pro application is now connected and ready to use! The backend and frontend are fully integrated with:

✅ User authentication
✅ QR code generation with customization
✅ File upload for logos
✅ Security features (passwords, expiry, limits)
✅ Analytics and tracking
✅ Responsive UI with dark mode
✅ Protected routes
✅ Real-time data from backend

Enjoy creating and managing your QR codes!
