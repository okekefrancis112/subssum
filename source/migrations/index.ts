import { Types } from "mongoose";
import userRepository from "../repositories/user.repository";
import UtilFunctions, { slugify } from "../util";
import walletRepository from "../repositories/wallet.repository";
import {
    IKebleTransactionType,
    ITransactionType,
} from "../interfaces/transaction.interface";
import listingRepository from "../repositories/listing.repository";
import planRepository from "../repositories/portfolio.repository";
import {
    IPortfolioCategory,
    IPortfolioOccurrence,
    IPortfolioStatus,
} from "../interfaces/plan.interface";
import banksRepository from "../repositories/banks.repository";
import { IBankCountry } from "../interfaces/banks.interface";
import investmentRepository from "../repositories/investment.repository";
import faqRepository from "../repositories/faq.repository";
import { IInvestmentStatus } from "../interfaces/investment.interface";
import { get } from "fingerprintjs2";
import transactionRepository from "../repositories/transaction.repository";

// const users = require('./users');
// const wallets = require('./wallets');
// const listings = require('./listings');
// const plans = require('./plans');
// const banks = require('./banks');
// const faqs = require('./faqs');

export async function up() {
    const processedIds: string[] = []; // Array to store processed _id values

    await Promise.all([
        // users.map(async (user: any) => {
        //   const {
        //     _id,
        //     firstName = '',
        //     lastName = '',
        //     email,
        //     password,
        //     image = '',
        //     active,
        //     address = '',
        //     country = '',
        //     dob,
        //     // gender,
        //     // hearAbout,
        //     mobileNo,
        //     nokAddress = '',
        //     nokCountry = '',
        //     nokEmail = '',
        //     nokFirstName,
        //     nokLastName,
        //     nokMobileNo,
        //     // nokRelationship,
        //     nokState = '',
        //     createdAt,
        //     updatedAt,
        //     lastLogin,
        //   } = user;
        //   const check_user = await userRepository.getByEmail({ email });
        //   if (check_user) {
        //     console.log('User already exists');
        //     return; // Skip the rest of the code for this iteration
        //   }
        //   if (processedIds.includes(_id.$oid)) {
        //     console.log('Duplicate document found');
        //     return; // Skip the rest of the code for this iteration
        //   }
        //   processedIds.push(_id.$oid); // Add _id to the processedIds array
        //   const new_user = {
        //     _id: new Types.ObjectId(_id.$oid),
        //     first_name: firstName ? firstName : '',
        //     last_name: lastName ? lastName : '',
        //     email: email.toLowerCase(),
        //     password,
        //     profile_photo: image ? image : '',
        //     address: address ? address : '',
        //     country: country ? country : '',
        //     dob: dob ? dob.split('/').join('-') : '',
        //     verified_email: active ? true : false,
        //     // gender,
        //     // where_how: hearAbout,
        //     phone_number: mobileNo ? String(mobileNo) : '',
        //     nok_address: nokAddress ? nokAddress : '',
        //     nok_country: nokCountry ? nokCountry : '',
        //     nok_email: nokEmail ? nokEmail : '',
        //     nok_fullname: nokFirstName ? `${nokFirstName} ${nokLastName}` : '',
        //     nok_phone_number: nokMobileNo ? String(nokMobileNo) : '',
        //     // nok_relationship: nokRelationship,
        //     nok_state: nokState ? nokState : '',
        //     user_ref_code: UtilFunctions.generateReferralCode(),
        //     last_login: lastLogin ? new Date(lastLogin.$date) : new Date(),
        //     createdAt: createdAt ? new Date(createdAt.$date) : new Date(),
        //     updatedAt: updatedAt ? new Date(updatedAt.$date) : new Date(),
        //   };
        //   const migrate_users = await userRepository.createMigrateUser(new_user);
        //   if (migrate_users) {
        //     console.log(`${email} migrated successfully`);
        //   }
        // }),
        // Wallet Migration
        // wallets.map(async (wallet: any) => {
        //   const {
        //     _id,
        //     user,
        //     userId,
        //     balance,
        //     createdAt,
        //     updatedAt,
        //     status,
        //     lastWithdrawal,
        //     lastDeposit,
        //   } = wallet;
        //   const check_wallet = await walletRepository.getByUserId({ user_id: userId });
        //   const account_number = await UtilFunctions.generateWalletAccountNumber();
        //   if (check_wallet) {
        //     console.log('Wallet already exists');
        //   } else {
        //     const new_wallet = {
        //       _id: new Types.ObjectId(_id.$oid),
        //       user_id: new Types.ObjectId(userId),
        //       user: {
        //         first_name: user.firstName,
        //         last_name: user.lastName,
        //         email: user.email,
        //       },
        //       wallet_account_number: account_number,
        //       status: status ? status : 'active',
        //       currency: ICurrency.USD,
        //       balance: balance ? Number(balance.$numberDecimal) / 771 : 0,
        //       createdAt: createdAt ? new Date(createdAt.$date) : new Date(),
        //       updatedAt: updatedAt ? new Date(updatedAt.$date) : new Date(),
        //       last_withdrawal: lastWithdrawal ? Number(lastWithdrawal.$numberDecimal) : 0,
        //       last_deposit: lastDeposit ? Number(lastDeposit.$numberDecimal) : 0,
        //     };
        //     const migrate_wallet = await walletRepository.createMigration(new_wallet);
        //     if (migrate_wallet) {
        //       console.log(`Wallet migrated successfully`);
        //     }
        //   }
        // }),
        // listings.map(async (listing: any) => {
        //   const {
        //     _id,
        //     nameOfProject,
        //     imageOfProject,
        //     description,
        //     investmentPurpose,
        //     roi,
        //     location,
        //     status,
        //     slug,
        //     holdingPeriod,
        //     minimumInvestment,
        //     investors,
        //     currency,
        //     totalInvestments,
        //     availableTokens,
        //     partiesInvolved,
        //     startDate,
        //     endDate,
        //     createdAt,
        //     updatedAt,
        //     createdBy,
        //   } = listing;
        //   const check_listing = await listingRepository.getOne({ slug });
        //   if (check_listing) {
        //     console.log('Listing already exists');
        //   } else {
        //     const new_listing = {
        //       _id: new Types.ObjectId(_id.$oid),
        //       project_name: nameOfProject ? nameOfProject : '',
        //       project_image: imageOfProject ? imageOfProject : '',
        //       description: description ? description : '',
        //       minimum_amount: minimumInvestment ? Number(minimumInvestment) : 0,
        //       total_amount: totalInvestments ? Number(totalInvestments.$numberDecimal) : 0,
        //       location: location ? location : '',
        //       holding_period: holdingPeriod ? Number(holdingPeriod) : 0,
        //       available_tokens: availableTokens ? Number(availableTokens) : 0,
        //       //   created_by: new Types.ObjectId(createdBy.userId),
        //       status: status ? status : 'active',
        //       returns: roi ? Number(roi) : 0,
        //       slug: slug ? slug : '',
        //       currency: currency ? currency : 'USD',
        //       parties_involved: partiesInvolved ? partiesInvolved : '',
        //       investors: investors
        //         ? investors.map((investor: any) => new Types.ObjectId(investor.$oid))
        //         : [],
        //       start_date: startDate.$date,
        //       end_date: endDate.$date,
        //       createdAt: createdAt ? new Date(createdAt.$date) : new Date(),
        //       updatedAt: updatedAt ? new Date(updatedAt.$date) : new Date(),
        //     };
        //     const migrate_listing = await listingRepository.createMigrate(new_listing);
        //     if (migrate_listing) {
        //       console.log(`Listing migrated successfully`);
        //     }
        //     // console.log({
        //     //   _id,
        //     //   nameOfProject,
        //     //   imageOfProject,
        //     //   description,
        //     //   investmentPurpose,
        //     //   roi,
        //     //   location,
        //     //   status,
        //     //   slug,
        //     //   holdingPeriod,
        //     //   minimumInvestment,
        //     //   investors,
        //     //   currency,
        //     //   totalInvestments,
        //     //   availableTokens,
        //     //   partiesInvolved,
        //     //   startDate,
        //     //   endDate,
        //     //   createdAt,
        //     //   updatedAt,
        //     //   createdBy,
        //     // });
        //   }
        // }),
        // plans.map(async (plan: any) => {
        //   const {
        //     userId,
        //     listing,
        //     listingId,
        //     no_tokens,
        //     currency,
        //     naira_value,
        //     amount_invested,
        //     investmentStatus,
        //     createdAt,
        //     updatedAt,
        //   } = plan;
        //   const check_plan = await planRepository.getOne({
        //     listing_id: new Types.ObjectId(listingId.$oid),
        //   });
        //   const listing_check = await listingRepository.getOne({
        //     _id: listingId.$oid,
        //   });
        //   const test_listing = await listingRepository.getOne({
        //     _id: new Types.ObjectId('62aac1c3f9087a7af6108e7f'),
        //   });
        //   if (check_plan) {
        //     console.log('Plan already exists');
        //   } else {
        //     // console.log({
        //     //   userId,
        //     //   listing,
        //     //   listingId,
        //     //   no_tokens,
        //     //   currency,
        //     //   naira_value,
        //     //   amount_invested,
        //     //   investmentStatus,
        //     //   createdAt,
        //     //   updatedAt,
        //     // });
        //     const new_plan = {
        //       user_id: new Types.ObjectId(userId.$oid),
        //       plan_name: listing_check ? `${listing_check.project_name}` : undefined,
        //       listing_id: listing_check ? new Types.ObjectId(listing_check._id) : undefined,
        //       plan_category: IPlanCategory.INVESTMENT,
        //       plan_currency: currency == ICurrency.USD ? ICurrency.USD : ICurrency.NGN,
        //       amount: currency == ICurrency.USD ? amount_invested : naira_value,
        //       total_amount: currency == ICurrency.USD ? amount_invested : naira_value,
        //       plan_occurrence: IPlanOccurrence.ONE_TIME_PAYMENT,
        //       plan_status: investmentStatus
        //         ? investmentStatus == 'ongoing'
        //           ? IPlanStatus.RESUME
        //           : IPlanStatus.COMPLETE
        //         : IPlanStatus.RESUME,
        //       no_tokens: no_tokens ? Number(no_tokens) : 0,
        //       duration: listing_check ? listing_check.holding_period : 0,
        //       end_date: listing_check && listing_check.end_date,
        //       start_date: listing_check && listing_check.start_date,
        //       createdAt: createdAt ? new Date(createdAt.$date) : new Date(),
        //       updatedAt: updatedAt ? new Date(updatedAt.$date) : new Date(),
        //     };
        //     const migrate_plan = await planRepository.createMigrate(new_plan);
        //     if (migrate_plan) {
        //       const investment = {
        //         user_id: migrate_plan.user_id,
        //         plan: migrate_plan._id,
        //         investment_currency: migrate_plan.plan_currency,
        //         listing_id: migrate_plan.listing_id,
        //         no_tokens: migrate_plan.no_tokens,
        //         amount: migrate_plan.amount,
        //         investment_occurrence: migrate_plan.plan_occurrence,
        //         duration: migrate_plan.duration,
        //         investment_status:
        //           migrate_plan.plan_status === IPlanStatus.COMPLETE
        //             ? IInvestmentStatus.INVESTMENT_MATURED
        //             : IInvestmentStatus.INVESTMENT_ACTIVE,
        //         start_date: migrate_plan.start_date,
        //         end_date: migrate_plan.end_date,
        //       };
        //       const migrate_investment = await investmentRepository.createMigrate(investment);
        //       // Atomic Update Plan
        //       const planUpdate = await planRepository.atomicUpdate(migrate_plan._id, {
        //         $addToSet: { investments: migrate_investment._id },
        //       });
        //       console.log(`Plan migrated successfully`);
        //       console.log(`Investment created successfully, ${migrate_investment._id}`);
        //     }
        //   }
        // }),
        // banks.map(async (bank: any) => {
        //   const { _id, userId, bankName, bankAccountName, bankAccountNumber, createdAt, updatedAt } =
        //     bank;
        //   const check_bank = await banksRepository.getOne({ user_id: userId.$oid });
        //   if (check_bank) {
        //     console.log('Bank already exists');
        //   } else {
        //     const new_bank = {
        //       _id: new Types.ObjectId(_id.$oid),
        //       user_id: new Types.ObjectId(userId.$oid),
        //       country: IBankCountry.NIGERIA,
        //       bank_name: bankName ? bankName : '',
        //       account_name: bankAccountName ? bankAccountName : '',
        //       account_number: bankAccountNumber ? bankAccountNumber : '',
        //       primary: true,
        //       createdAt: createdAt ? new Date(createdAt.$date) : new Date(),
        //       updatedAt: updatedAt ? new Date(updatedAt.$date) : new Date(),
        //     };
        //     const migrate_bank = await banksRepository.createMigrateBank(new_bank);
        //     if (migrate_bank) {
        //       console.log(`Bank migrated successfully`);
        //     }
        //   }
        // }),
        // FAQ Category Migration
        // faqs.map(async (faq: any) => {
        //   const { category } = faq;
        //   const check_faq_category = await faqRepository.getCategoryById({
        //     _id: new Types.ObjectId(category.categoryId),
        //   });
        //   if (check_faq_category) {
        //     console.log('FAQ Category already exists');
        //   } else {
        //     const new_faq_category = {
        //       _id: new Types.ObjectId(category.categoryId),
        //       category_name: category.category,
        //       category_description: category.category,
        //       category_alias: slugify(category.category),
        //     };
        //     const migrate_faq_category = await faqRepository.createCategory(new_faq_category);
        //     if (migrate_faq_category) {
        //       console.log(`FAQ Category migrated successfully`);
        //     }
        //   }
        // }),
        // // FAQ's Migration
        // faqs.map(async (faq: any) => {
        //   const { _id, category, question, answer, status, user, createdAt, updatedAt } = faq;
        //   const faq_category = await faqRepository.getCategoryById({
        //     _id: new Types.ObjectId(category.categoryId),
        //   });
        //   console.log(faq_category);
        //   const check_faq = await faqRepository.getFaqById({
        //     faq_id: new Types.ObjectId(_id.$oid),
        //   });
        //   if (check_faq) {
        //     console.log('FAQ already exists');
        //   } else {
        //     const new_faq = {
        //       _id: new Types.ObjectId(_id.$oid),
        //       category_id: new Types.ObjectId(faq_category._id),
        //       question: question ? question : '',
        //       answer: answer ? answer : '',
        //       status: 'published',
        //       created_by: new Types.ObjectId(user.userId),
        //       createdAt: createdAt ? new Date(createdAt.$date) : new Date(),
        //       updatedAt: updatedAt ? new Date(updatedAt.$date) : new Date(),
        //     };
        //     const migrate_faq = await faqRepository.createFaqMigrate(new_faq);
        //     if (migrate_faq) {
        //       console.log(`FAQ migrated successfully`);
        //     }
        //   }
        // }),
    ]);
}

// ! Function to fix transaction ID's into Investments

// export async function up_investments() {
//   const investments = await investmentRepository.find({});

//   investments.map(async (e: any) => {
//     const get_transaction = await transactionRepository.getOne({ sub_entity_reference_id: e._id });

//     if (get_transaction) {
//       const update = await investmentRepository.atomicUpdate(e._id, {
//         transaction_id: get_transaction._id,
//       });

//       if (update) {
//         console.log(`Investment ${e._id} updated successfully`);
//       }
//     }
//   });
// }
