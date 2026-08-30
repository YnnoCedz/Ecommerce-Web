import 'package:flutter/material.dart';

abstract final class AppRadius {
  static const sm = Radius.circular(4);
  static const md = Radius.circular(8);
  static const lg = Radius.circular(12);
  static const pill = Radius.circular(999);
  static const card = BorderRadius.all(md);
}
