import Notification from "./notification.model.js";
const err = (m, c = 400) => Object.assign(new Error(m), { statusCode: c });
export const createNotification = async (d) => Notification.create(d);
export const listNotifications = async (user, q = {}) => {
  const page = Math.max(1, Number(q.page || 1)),
    limit = Math.min(100, Number(q.limit || 20));
  const [data, total] = await Promise.all([
    Notification.find({ userId: String(user.id) })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ userId: String(user.id) }),
  ]);
  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};
export const markRead = async (id, user) => {
  const n = await Notification.findOneAndUpdate(
    { _id: id, userId: String(user.id) },
    { $set: { readAt: new Date(), status: "read" } },
    { new: true },
  ).lean();
  if (!n) throw err("Notification not found", 404);
  return n;
};
