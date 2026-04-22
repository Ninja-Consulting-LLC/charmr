import {Request, Response} from 'express';
import {Database} from '../../db/types';
import logger from '../../utils/logger';


export const updateUser = async (req: Request, res: Response, db: Database) => {
  try {
    const {userId} = req.params;
    const {name, email} = req.body;

    if (!name && !email) {
      return res.status(400).json({error: 'No fields to update'});
    }

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    // Prepare update fields
    const updateFields: any = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;

    await db.updateUser(userId, updateFields);
    const updatedUser = await db.getUser(userId);
    res.json(updatedUser);
  } catch (error) {
    logger.error('Error updating user:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
    });
    res.status(500).json({error: 'Failed to update user'});
  }
};

export const deleteUser = async (req: Request, res: Response, db: Database) => {
  try {
    const {userId} = req.params;

    // First check if user exists
    const user = await db.getUser(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    // Mark user as deleted
    await db.deleteUser(userId);

    logger.info('User marked as deleted:', {userId});
    res.status(200).json({message: 'User deleted successfully'});
  } catch (error) {
    logger.error('Error deleting user:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.params.userId,
    });
    res.status(500).json({error: 'Failed to delete user'});
  }
};
