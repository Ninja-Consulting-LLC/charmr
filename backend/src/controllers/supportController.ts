import {Request, Response} from 'express';
import {SupportRequest} from '../types/email';

export const submitSupportRequest = async (req: Request, res: Response) => {
  try {
    console.log(
      `[${new Date().toISOString()}] [Support] Received support request:`,
      {
        ...req.body,
        headers: {
          authorization: req.headers.authorization
            ? 'Bearer [REDACTED]'
            : 'none',
          'x-auth-bypass': req.headers['x-auth-bypass'] || 'false',
        },
      },
    );

    const request: SupportRequest = req.body;
    const supportEmailService = req.app.locals.supportEmailService;

    if (!supportEmailService) {
      console.error(
        `[${new Date().toISOString()}] [Support] Support email service not initialized`,
      );
      throw new Error('Support email service not initialized');
    }

    console.log(
      `[${new Date().toISOString()}] [Support] Sending support request via email service`,
    );
    await supportEmailService.sendSupportRequest(request);

    console.log(
      `[${new Date().toISOString()}] [Support] Support request submitted successfully`,
    );
    res.status(200).json({message: 'Support request submitted successfully'});
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] [Support] Error submitting support request:`,
      error,
    );
    res.status(500).json({error: 'Failed to submit support request'});
  }
};
