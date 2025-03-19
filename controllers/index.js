/**
 * Tập trung quản lý tất cả các controllers
 * File này giúp việc import controllers dễ dàng hơn
 */
const authController = require('./authController');
const userController = require('./userController');
const courseController = require('./courseController');
const lessonController = require('./lessonController');
const enrollmentController = require('./enrollmentController');
const progressController = require('./progressController');
const reviewController = require('./reviewController');
const commentController = require('./commentController');
const categoryController = require('./categoryController');
const postController = require('./postController');
const paymentController = require('./paymentController');
const notificationController = require('./notificationController');
const sessionController = require('./sessionController');
const settingController = require('./settingController');
const menuController = require('./menuController');
const widgetController = require('./widgetController');
const imageController = require('./imageController');
const bannerController = require('./bannerController');
const partnerController = require('./partnerController');
const roleController = require('./roleController');
const statsController = require('./statsController');

module.exports = {
  authController,
  userController,
  courseController,
  lessonController,
  enrollmentController,
  progressController,
  reviewController,
  commentController,
  categoryController,
  postController,
  paymentController,
  notificationController,
  sessionController,
  settingController,
  menuController,
  widgetController,
  imageController,
  bannerController,
  partnerController,
  roleController,
  statsController
}; 