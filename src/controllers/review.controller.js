import Review from '../models/review.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const getApprovedReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ status: 'approved' })
      .sort({ createdAt: -1 })
      .populate('student', 'name');

    res.status(200).json(new ApiResponse(200, reviews, 'Approved reviews fetched successfully'));
  } catch (error) {
    next(error);
  }
};

export const getAllReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find()
      .sort({ createdAt: -1 })
      .populate('student', 'name');

    res.status(200).json(new ApiResponse(200, reviews, 'All reviews fetched successfully'));
  } catch (error) {
    next(error);
  }
};

export const createReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    const review = await Review.create({
      student: req.user._id,
      rating,
      comment,
      status: 'pending', // default is pending
    });

    res.status(201).json(new ApiResponse(201, review, 'Review submitted successfully and is pending approval'));
  } catch (error) {
    next(error);
  }
};

export const updateReviewStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      throw new ApiError(400, 'Invalid status value');
    }

    const review = await Review.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).populate('student', 'name');

    if (!review) {
      throw new ApiError(404, 'Review not found');
    }

    res.status(200).json(new ApiResponse(200, review, 'Review status updated successfully'));
  } catch (error) {
    next(error);
  }
};
