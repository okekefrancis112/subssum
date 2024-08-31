import { Types } from 'mongoose';

import { INotificationDocument } from '../interfaces/notification.interface';
import { Notification } from '../models';
import userRepository from './user.repository';

class NotificationRepository {
  // Function to create user notification
  public async create({
    user_id,
    title,
    notification_category,
    content,
    action_link,
  }: {
    user_id: Types.ObjectId;
    title: string;
    notification_category: string;
    content?: any;
    action_link?: any;
  }): Promise<INotificationDocument> {
    const notification = {
      user_id,
      title,
      notification_category,
      content,
      action_link,
    };

    const data = await Notification.create(notification);

    // Update user notification count
    await userRepository.atomicUpdate(user_id, { $inc: { notification_count: 1 } });

    return data;
  }

  // Function to get user notifications
  public async getNotifications({
    user_id,
  }: {
    user_id: Types.ObjectId;
  }): Promise<INotificationDocument | null | any> {
    return Notification.find({ user_id: user_id }).sort({ createdAt: -1 });
  }

  // Function to get user notifications
  public async getRecentNotifications({
    user_id,
  }: {
    user_id: Types.ObjectId;
  }): Promise<INotificationDocument | null | any> {
    return Notification.find({ user_id: user_id }).sort({ createdAt: -1 }).limit(10);
  }

  // Function to get a user notification by notification_id
  public async getNotificationById({
    notification_id,
  }: {
    notification_id: Types.ObjectId;
  }): Promise<INotificationDocument | null | any> {
    return Notification.findById(notification_id);
  }

  // Function to update a user notification by notification_id
  public async atomicUpdate(notification_id: Types.ObjectId, record: any) {
    return Notification.findOneAndUpdate({ _id: notification_id }, { ...record }, { new: true });
  }

  // Function to mark a user notification as read
  public async markAllAsRead(
    user_id: Types.ObjectId,
    record: any
  ): Promise<INotificationDocument[] | null | any> {
    return Notification.updateMany({ user_id: user_id }, { ...record }, { new: true });
  }

  // Function to delete a user notification by notification_id
  public async deleteNotification(
    notification_id: Types.ObjectId
  ): Promise<INotificationDocument | null> {
    return Notification.findByIdAndDelete(notification_id);
  }

  // Function to delete all user notification
  public async deleteAllNotification({ user_id }: { user_id: Types.ObjectId }) {
    return Notification.deleteMany({ user_id: user_id });
  }
}

// Export NotificationRepository
export default new NotificationRepository();
