import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

export const requireAppointmentOwnership = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params.id as any;
      const user = req.auth;

      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const appointment = await prisma.appointment.findUnique({
        where: { id },
        select: { id: true, patientId: true, status: true },
      });

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      const isOwner = appointment.patientId === user.userId;
      const hasOverride = user.permissions.includes('appointments:read_all') || user.roleId === '3';

      if (!isOwner && !hasOverride) {
        return res.status(403).json({
          message: 'Forbidden: You do not have permission to access or modify this appointment',
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
