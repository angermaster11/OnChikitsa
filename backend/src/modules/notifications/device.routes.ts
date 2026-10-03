import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { firebaseAuth } from '../../middleware/firebaseAuth';
import { deviceController } from './device.controller';
import { registerDeviceSchema, unregisterDeviceSchema } from './notification.validation';

/** Patient device-token registration — mounted at /api/v1/user/devices (Firebase USER). */
export const userDeviceRoutes = Router();
userDeviceRoutes.use(firebaseAuth('USER'));
userDeviceRoutes.post('/', validate({ body: registerDeviceSchema }), deviceController.register);
userDeviceRoutes.post('/remove', validate({ body: unregisterDeviceSchema }), deviceController.unregister);

export const clinicDeviceRoutes = Router();
clinicDeviceRoutes.use(firebaseAuth('CLINIC'));
clinicDeviceRoutes.post('/', validate({ body: registerDeviceSchema }), deviceController.register);
clinicDeviceRoutes.post('/remove', validate({ body: unregisterDeviceSchema }), deviceController.unregister);
