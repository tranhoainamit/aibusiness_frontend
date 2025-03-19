/**
 * Tập trung quản lý tất cả các models
 * File này giúp việc import models dễ dàng hơn
 */
const User = require('./User');
const Role = require('./Role');
const Course = require('./Course');
const Lesson = require('./Lesson');
const Enrollment = require('./Enrollment');
const Progress = require('./Progress');
const Review = require('./Review');
const Comment = require('./Comment');
const Category = require('./Category');
const Post = require('./Post');
const Payment = require('./Payment');
const Notification = require('./Notification');
const Session = require('./Session');
const Setting = require('./Setting');
const Menu = require('./Menu');
const Widget = require('./Widget');
const Image = require('./Image');
const Banner = require('./Banner');
const Partner = require('./Partner');
const Coupon = require('./Coupon');
const Purchase = require('./Purchase');

module.exports = {
  User,
  Role,
  Course,
  Lesson,
  Enrollment,
  Progress,
  Review,
  Comment,
  Category,
  Post,
  Payment,
  Notification,
  Session,
  Setting,
  Menu,
  Widget,
  Image,
  Banner,
  Partner,
  Coupon,
  Purchase
}; 