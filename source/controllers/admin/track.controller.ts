import { Types } from 'mongoose';
import { Response } from 'express';
import { ExpressRequest } from '../../server';
import { throwIfAdminUserUndefined } from '../../util';
import ResponseHandler from '../../util/response-handler';
import trackRepository from '../../repositories/track.repository';
import { HTTP_CODES } from '../../constants/app_defaults.constant';

/****
 *
 *
 * Admin Create Track
 */

export async function createTrack(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    const admin_user = throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const { asset_acquired, countries, disbursed_dividends } = req.body;

    const track = await trackRepository.create({
      asset_acquired,
      countries,
      disbursed_dividends,
      created_by: admin_user._id,
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.CREATED,
      message: 'Success! User track created.',
      data: track,
    });
  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/****
 *
 *
 * Fetch All Tracks
 */
export async function getTrack(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const tracks = await trackRepository.findAdmin(req);

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Your Tracks are ready and waiting for you!',
      data: tracks,
    });
  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/****
 *
 *
 * Update Track
 */

export async function updateTrack(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const track_id = new Types.ObjectId(req.params.track_id);
    const { asset_acquired, countries, disbursed_dividends } = req.body;

    const editTrack = await trackRepository.atomicUpdate({_id: track_id}, {
      $set: {
        asset_acquired: asset_acquired,
        countries: countries,
        disbursed_dividends: disbursed_dividends,
      },
    });

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'User Track updated successfully',
      data: editTrack,
    });
  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/****
 *
 *
 * Delete Track
 */
export async function deleteTrack(req: ExpressRequest, res: Response): Promise<Response | void> {
  try {
    throwIfAdminUserUndefined(req.admin_user, 'req.admin_user');
    const track_id = new Types.ObjectId(req.params.track_id);
    const delTrack = await trackRepository.delete({_id: track_id});

    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Looking great! Your track has been updated.',
      data: delTrack,
    });
  } catch (error) {
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}

/***********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * ********************** LANDING PAGE *********************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 * *********************************************************************
 */

/****
 *
 *
 *
 * Get Tracks Landing Page
 */

export async function getTracksLanding(
  req: ExpressRequest,
  res: Response
): Promise<Response | void> {
  try {
    const track = await trackRepository.findLandingPage();
    return ResponseHandler.sendSuccessResponse({
      res,
      code: HTTP_CODES.OK,
      message: 'Fetch successful! Your track landing details have arrived safely.',
      data:track
    });
  } catch (error) {
    // }
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.INTERNAL_SERVER_ERROR,
      error: `${error}`,
    });
  }
}
