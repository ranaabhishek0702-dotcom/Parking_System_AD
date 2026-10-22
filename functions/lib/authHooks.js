"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUserRole = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const shared_1 = require("@parksense/shared");
if (!admin.apps.length) {
    admin.initializeApp();
}
const auth = admin.auth();
const firestore = admin.firestore();
/**
 * Assigns custom claims to a Firebase Auth user.
 * In production, restricted to callers with 'super_admin' custom claim.
 * In emulator/dev mode, allows bootstrapping initial admins.
 */
exports.setUserRole = (0, https_1.onRequest)({
    cors: true,
    region: 'us-central1'
}, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }
    try {
        const { uid, role, zoneId } = req.body;
        if (!uid || typeof uid !== 'string') {
            res.status(400).json({ error: 'Missing or invalid uid parameter' });
            return;
        }
        if (!role || !shared_1.USER_ROLES.includes(role)) {
            res.status(400).json({
                error: `Invalid role. Allowed roles: ${shared_1.USER_ROLES.join(', ')}`
            });
            return;
        }
        // Check caller auth if not running on emulator
        const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV !== 'production';
        if (!isEmulator) {
            const authHeader = req.headers.authorization;
            if (!authHeader?.startsWith('Bearer ')) {
                res.status(401).json({ error: 'Unauthorized: missing Bearer token' });
                return;
            }
            const idToken = authHeader.split('Bearer ')[1];
            const decoded = await auth.verifyIdToken(idToken);
            if (decoded.role !== 'super_admin') {
                res.status(403).json({ error: 'Forbidden: only super_admin can assign roles' });
                return;
            }
        }
        // Set custom claims on Firebase Auth
        const customClaims = { role };
        if (zoneId) {
            customClaims.zoneId = zoneId;
        }
        await auth.setCustomUserClaims(uid, customClaims);
        // Mirror role update into Firestore /users/{uid}
        await firestore.collection('users').doc(uid).set({
            roles: [role],
            assignedZone: zoneId || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        res.status(200).json({
            status: 'success',
            message: `Successfully set role '${role}' for user ${uid}`,
            customClaims
        });
    }
    catch (err) {
        console.error('Error setting user role:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message
        });
    }
});
//# sourceMappingURL=authHooks.js.map