import 'package:flutter/material.dart';

import 'analytics_screen.dart';
import 'dashboard_widgets.dart';
import 'history_screen.dart';
import 'profile_screen.dart';
import 'query_screen.dart';
import 'vision_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key, this.initialIndex = 0});

  final int initialIndex;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
  }

  @override
  Widget build(BuildContext context) {
    const pages = [
      VisionScreen(),
      HistoryScreen(),
      QueryScreen(),
      AnalyticsScreen(),
      ProfileScreen(),
    ];

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF090C13), Color(0xFF04060C), Color(0xFF010206)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: IndexedStack(index: _currentIndex, children: pages),
              ),
              BottomNavBar(
                currentIndex: _currentIndex,
                onChanged: (index) => setState(() => _currentIndex = index),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
