import {Request, Response} from 'express';
import {databaseConfig} from '../../config/database';
import {Database} from '../../db/types';
import logger from '../../utils/logger';


export const linkAnonymousUser = async (
  req: Request,
  res: Response,
  db: Database,
) => {
  try {
    const {anonymousUserId, registeredUserId, installationId} = req.body;
    logger.info('Starting user linking process', {
      anonymousUserId,
      registeredUserId,
      installationId,
    });

    if (!anonymousUserId || !registeredUserId) {
      logger.warning('Missing required fields for user linking', {
        hasAnonymousUserId: !!anonymousUserId,
        hasRegisteredUserId: !!registeredUserId,
      });
      return res.status(400).json({error: 'Missing required fields'});
    }

    // Get the anonymous user's data
    const anonymousUser = await db.getUser(anonymousUserId);
    if (!anonymousUser) {
      logger.warning('Anonymous user not found during linking', {
        anonymousUserId,
        registeredUserId,
      });
      return res.status(404).json({error: 'Anonymous user not found'});
    }
    logger.info('Found anonymous user', {
      anonymousUserId,
      anonymousUserEmail: anonymousUser.email,
      anonymousUserInstallationId: anonymousUser.installationId,
    });

    // Get the registered user
    const registeredUser = await db.getUser(registeredUserId);
    if (!registeredUser) {
      logger.warning('Registered user not found during linking', {
        anonymousUserId,
        registeredUserId,
      });
      return res.status(404).json({error: 'Registered user not found'});
    }
    logger.info('Found registered user', {
      registeredUserId,
      registeredUserEmail: registeredUser.email,
      registeredUserInstallationId: registeredUser.installationId,
    });

    // Transfer all messages from anonymous to registered user
    logger.info('Transferring messages from anonymous to registered user', {
      anonymousUserId,
      registeredUserId,
    });
    await db.run('UPDATE messages SET userId = ? WHERE userId = ?', [
      registeredUserId,
      anonymousUserId,
    ]);

    // Transfer any remaining extra messages
    const newExtraMessages =
      registeredUser.extraMessages + anonymousUser.extraMessages;
    logger.info('Transferring extra messages', {
      anonymousUserId,
      registeredUserId,
      anonymousExtraMessages: anonymousUser.extraMessages,
      registeredExtraMessages: registeredUser.extraMessages,
      newTotalExtraMessages: newExtraMessages,
    });
    await db.updateUser(registeredUserId, {
      extraMessages: newExtraMessages,
      installationId: installationId || registeredUser.installationId,
    });

    // Skip deleting the anonymous user for now
    logger.info('Skipping anonymous user deletion as requested', {
      anonymousUserId,
      registeredUserId,
    });

    logger.info('Successfully linked anonymous user to registered user', {
      anonymousUserId,
      registeredUserId,
      installationId,
      transferredExtraMessages: newExtraMessages,
    });

    if (databaseConfig.type === 'firestore') {
      await db.linkUsers(anonymousUserId, registeredUserId);
      return res.json({message: 'User linked successfully (firestore)'});
    }

    res.json({message: 'User linked successfully'});
  } catch (error) {
    logger.error('Error linking users:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      anonymousUserId: req.body.anonymousUserId,
      registeredUserId: req.body.registeredUserId,
      installationId: req.body.installationId,
    });
    res.status(500).json({error: 'Failed to link users'});
  }
};
