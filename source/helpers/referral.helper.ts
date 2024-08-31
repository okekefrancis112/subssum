import { Types } from 'mongoose';
import userRepository from '../repositories/user.repository';
import walletRepository from '../repositories/wallet.repository';
import { WALLET_CONSTANT } from '../constants/wallet.constant';
import { getPercent } from '../util';

// Process Referral

export const processReferral = async (
  investor_id: Types.ObjectId,
  amount: number,
  session: any
): Promise<any> => {
  const getInvestor = await userRepository.getById({ _id: investor_id });

  if (!getInvestor) {
    return {
      success: false,
      message: 'Investor does not exist',
    };
  }

  if (
    getInvestor.referred_by !== null &&
    getInvestor.referred_by !== undefined &&
    !getInvestor?.has_invest
  ) {
    const referee_id = new Types.ObjectId(String(getInvestor.referred_by));

    const get_referee = await userRepository.getById({ _id: referee_id });

    // Update investors investment status
    await userRepository.atomicUpdate(investor_id, { $set: { has_invest: true } }, session);

    // Update Referees user count
    await userRepository.atomicUpdate(
      referee_id,
      { $inc: { referral_invested_count: 1 } },
      session
    );

    const referral_amount = amount * getPercent(WALLET_CONSTANT.REFERRAL_PERCENT);

    const refereeReferWallet = await walletRepository.getReferByUserId({ user_id: referee_id });

    if (!refereeReferWallet) {
      // create a refer wallet for the user
      const refer = await walletRepository.createReferWallet({
        user_id: referee_id,
        user: {
          first_name: get_referee?.first_name,
          last_name: get_referee?.last_name,
          email: get_referee?.email,
        },
        balance: referral_amount,
        session: session,
      });
      return {
        success: true,
        message: 'Referral performed successfully',
        data: refer,
      };
    } else {
      const referral = await walletRepository.processReferWalletCreditUpdates({
        user_id: referee_id,
        amount: referral_amount,
        balance: Number(refereeReferWallet?.balance),
        session,
      });

      return {
        success: true,
        message: 'Referral performed successfully',
        data: referral,
      };
    }
  }
};
