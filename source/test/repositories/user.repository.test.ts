import request from 'supertest';
import { IUser, IUserDocument, IWhereHow } from '../../interfaces/user.interface';
import userRepository from '../../repositories/user.repository';
import { initDatabase } from '../../util/mongo';
import { ExpressRequest } from '../../server';

let user_object: any;

beforeAll(async () => {
  initDatabase();
  await userRepository.deleteAll();
});

afterAll(async () => {
  await userRepository.deleteAll();
});

const user_payload = {
  first_name: 'Valentine',
  middle_name: 'Chinedu',
  last_name: 'Offiah',
  email: 'valentine@keble.co',
  password: 'password',
  confirm_password: 'password',
  where_how: IWhereHow.FACEBOOK,
  country: 'Nigeria',
};

describe('User Repository', () => {
  jest.setTimeout(30000);
  it('should create a user', async () => {
    const user = await userRepository.create({
      first_name: 'Valentine',
      middle_name: 'Chinedu',
      last_name: 'Offiah',
      email: 'voffiah@gmail.com',
      password: 'password',
      confirm_password: 'password',
      where_how: IWhereHow.FACEBOOK,
      country: 'Nigeria',
    });

    expect(user).toHaveProperty('_id');
    expect(user).toHaveProperty('first_name');
    expect(user).toHaveProperty('middle_name');
    expect(user).toHaveProperty('last_name');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('password');
  });

  it('should update a user', async () => {
    const user = await userRepository.create(user_payload);
    const res = await userRepository.update({
      user: user,
      first_name: 'Valentine',
      middle_name: 'Chinedu',
      last_name: 'Offiah',
      password: 'password',
      profile_photo: 'profile_photo',
    });

    expect(res).toBeDefined();
  });

  it('should process one time Secret password', async () => {
    const user = await userRepository.create({ ...user_payload, email: 'test1@gmail.com' });
    const res = await userRepository.processOneTimeSecretPassword({
      user_id: user._id,
    });

    expect(res).toBeDefined();
  });

  it('should get user by ID', async () => {
    const user = await userRepository.create({ ...user_payload, email: 'test2@gmail.com' });
    const res = await userRepository.getById({
      _id: user._id,
    });

    expect(res).toBeDefined();
  });

  it('should get all users', async () => {
    const user = await userRepository.create({ ...user_payload, email: 'test3@gmail.com' });
    const req = {
      query: {
        page: 1,
        perpage: 10,
        dateFrom: '2021-01-01',
        dateTo: '2023-12-31',
        search: 'test',
      },
    } as unknown as ExpressRequest;
    const users = await userRepository.find(req, user._id);

    expect(users).toBeDefined();
  });
});
