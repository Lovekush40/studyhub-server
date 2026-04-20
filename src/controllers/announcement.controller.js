import Announcement from '../models/announcement.model.js';
import { ApiError } from '../utils/apiError.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';

export const getAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Announcement.find({ active: true })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name');

    sendSuccess(res, announcements, 'Announcements fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, priority, active } = req.body;

    const announcement = await Announcement.create({
      title,
      content,
      priority,
      active: active !== undefined ? active : true,
      createdBy: req.user._id,
    });

    sendCreated(res, announcement, 'Announcement created successfully');
  } catch (error) {
    next(error);
  }
};

export const updateAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, priority, active } = req.body;

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { title, content, priority, active },
      { new: true, runValidators: true }
    );

    if (!announcement) {
      throw new ApiError(404, 'Announcement not found');
    }

    sendSuccess(res, announcement, 'Announcement updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      throw new ApiError(404, 'Announcement not found');
    }

    sendSuccess(res, {}, 'Announcement deleted successfully');
  } catch (error) {
    next(error);
  }
};
