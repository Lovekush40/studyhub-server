import PublishedResult from '../models/published_result.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';

const getPublishedResults = asyncHandler(async (req, res) => {
  const query = {};
  if (req.user.role !== 'ADMIN') {
    query.isActive = true;
  }
  const results = await PublishedResult.find(query).sort({ createdAt: -1 });
  return sendSuccess(res, results, 'Published results fetched successfully');
});

const createPublishedResult = asyncHandler(async (req, res) => {
  const { title, description, link_url } = req.body;
  
  if (!title || !link_url) {
    throw new ApiError(400, 'Title and Link URL are required');
  }

  const newResult = await PublishedResult.create({
    title,
    description,
    link_url,
    created_by: req.user._id
  });

  return sendCreated(res, newResult, 'Published result created successfully');
});

const deletePublishedResult = asyncHandler(async (req, res) => {
  const deleted = await PublishedResult.findByIdAndDelete(req.params.id);
  if (!deleted) throw new ApiError(404, 'Published result not found');
  
  return sendSuccess(res, { success: true }, 'Published result deleted successfully');
});

export const publishedResultController = {
  getPublishedResults,
  createPublishedResult,
  deletePublishedResult
};
