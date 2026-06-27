import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/constants/app_colors.dart';
import '../core/services/data_service.dart';
import '../models/history_session.dart';
import '../models/vlm_query_record.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  final TextEditingController _searchController = TextEditingController();

  List<HistorySession> _allSessions = [];
  List<VlmQueryRecord> _allQueries = [];
  bool _loading = true;
  String? _loadError;

  int _selectedFilter = 0; // 0 all, 1 flagged, 2 completed
  bool _showVlmOnly = false;
  int? _expandedSessionIndex;
  int? _expandedQueryIndex;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final results = await Future.wait([
        DataService.instance.fetchDetections(),
        DataService.instance.fetchQueries(),
      ]);
      if (!mounted) return;
      setState(() {
        _allSessions = results[0] as List<HistorySession>;
        _allQueries = results[1] as List<VlmQueryRecord>;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _loadError = 'Could not load history. Check API connection.';
      });
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<HistorySession> get _filteredSessions {
    final query = _searchController.text.trim().toLowerCase();
    return _allSessions.where((session) {
      final statusMatch = switch (_selectedFilter) {
        1 => session.status == 'Flagged',
        2 => session.status == 'Completed',
        _ => true,
      };

      final queryMatch = query.isEmpty ||
          session.title.toLowerCase().contains(query) ||
          session.summary.toLowerCase().contains(query) ||
          session.trackedObjects.any((item) => item.toLowerCase().contains(query));

      return statusMatch && queryMatch;
    }).toList();
  }

  List<VlmQueryRecord> get _filteredQueries {
    if (!_showVlmOnly) return _allQueries;
    final sessionTokens = _filteredSessions
        .expand((s) => s.trackedObjects.map((e) => e.toLowerCase()))
        .toSet();

    return _allQueries
        .where(
          (query) => sessionTokens.any(
            (token) => query.prompt.toLowerCase().contains(token) || query.result.toLowerCase().contains(token),
          ),
        )
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }
    if (_loadError != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                _loadError!,
                textAlign: TextAlign.center,
                style: GoogleFonts.poppins(color: AppColors.mutedWhite),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: _loadHistory,
                child: const Text('Retry', style: TextStyle(color: AppColors.primary)),
              ),
            ],
          ),
        ),
      );
    }

    final sessions = _filteredSessions;
    final queries = _filteredQueries;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(14, 8, 14, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeader(),
          const SizedBox(height: 12),
          _buildSearchField(),
          const SizedBox(height: 10),
          _buildFilters(),
          const SizedBox(height: 14),
          _sectionLabel('TODAY, OCT 24'),
          const SizedBox(height: 10),
          ...List.generate(sessions.length, (index) {
            return _HistorySessionCard(
              session: sessions[index],
              expanded: _expandedSessionIndex == index,
              onTap: () => setState(() {
                _expandedSessionIndex = _expandedSessionIndex == index ? null : index;
              }),
            );
          }),
          const SizedBox(height: 14),
          const Divider(color: AppColors.darkGrey, height: 1),
          const SizedBox(height: 14),
          _buildVlmHeader(),
          const SizedBox(height: 10),
          ...List.generate(queries.length, (index) {
            return _VlmQueryCard(
              query: queries[index],
              expanded: _expandedQueryIndex == index,
              onTap: () => setState(() {
                _expandedQueryIndex = _expandedQueryIndex == index ? null : index;
              }),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      children: [
        Text(
          'INSIGHTVISION AI',
          style: GoogleFonts.poppins(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.white.withValues(alpha: 0.95),
            letterSpacing: 1.2,
          ),
        ),
        const Spacer(),
        Container(
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.statusBlue.withValues(alpha: 0.25),
          ),
          child: const Icon(Icons.bolt_rounded, color: Colors.white, size: 14),
        ),
      ],
    );
  }

  Widget _buildSearchField() {
    return TextField(
      controller: _searchController,
      onChanged: (_) => setState(() {}),
      style: GoogleFonts.poppins(fontSize: 12, color: AppColors.white),
      decoration: InputDecoration(
        hintText: 'Search sessions or events...',
        hintStyle: GoogleFonts.poppins(fontSize: 11, color: AppColors.grey),
        prefixIcon: const Icon(Icons.search, size: 16, color: AppColors.grey),
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.04),
        contentPadding: const EdgeInsets.symmetric(vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(999),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }

  Widget _buildFilters() {
    return Row(
      children: [
        _FilterChip(
          label: 'Date Range',
          selected: false,
          onTap: () {},
          icon: Icons.calendar_month_outlined,
        ),
        const SizedBox(width: 8),
        _FilterChip(
          label: 'Event Type',
          selected: _selectedFilter != 0,
          onTap: () => setState(() {
            _selectedFilter = (_selectedFilter + 1) % 3;
          }),
          icon: Icons.filter_alt_outlined,
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            _selectedFilter == 0
                ? 'ACTIVE FILTERS: NONE'
                : _selectedFilter == 1
                    ? 'ACTIVE FILTERS: FLAGGED'
                    : 'ACTIVE FILTERS: COMPLETED',
            style: GoogleFonts.poppins(
              fontSize: 9,
              letterSpacing: 0.8,
              color: AppColors.grey,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildVlmHeader() {
    return Row(
      children: [
        Text(
          'PREVIOUS VLM QUERIES',
          style: GoogleFonts.orbitron(
            fontSize: 16,
            color: AppColors.white,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.8,
          ),
        ),
        const Spacer(),
        InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: () => setState(() => _showVlmOnly = !_showVlmOnly),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(999),
              color: _showVlmOnly
                  ? AppColors.primary.withValues(alpha: 0.18)
                  : Colors.white.withValues(alpha: 0.04),
              border: Border.all(
                color: _showVlmOnly ? AppColors.primary : Colors.white.withValues(alpha: 0.10),
              ),
            ),
            child: Text(
              _showVlmOnly ? 'MATCHED' : 'ALL',
              style: GoogleFonts.poppins(
                fontSize: 10,
                color: _showVlmOnly ? AppColors.primary : AppColors.mutedWhite,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _sectionLabel(String text) {
    return Text(
      text,
      style: GoogleFonts.poppins(
        fontSize: 10,
        color: AppColors.primary,
        letterSpacing: 1.1,
      ),
    );
  }
}

class _HistorySessionCard extends StatelessWidget {
  const _HistorySessionCard({
    required this.session,
    required this.expanded,
    required this.onTap,
  });

  final HistorySession session;
  final bool expanded;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final statusColor = switch (session.status) {
      'Flagged' => AppColors.primary,
      'Review' => Colors.amberAccent,
      _ => AppColors.mutedWhite.withValues(alpha: 0.7),
    };

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF161A21), Color(0xFF0F1218)],
            ),
            border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
          ),
          child: Column(
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      color: Colors.white.withValues(alpha: 0.06),
                    ),
                    child: const Icon(Icons.image_search_rounded, color: AppColors.white, size: 24),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                session.title,
                                style: GoogleFonts.poppins(
                                  fontSize: 12,
                                  color: AppColors.white,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(999),
                                color: statusColor.withValues(alpha: 0.16),
                              ),
                              child: Text(
                                session.status,
                                style: GoogleFonts.poppins(
                                  fontSize: 9,
                                  color: statusColor,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          session.summary,
                          style: GoogleFonts.poppins(
                            fontSize: 10,
                            color: AppColors.mutedWhite.withValues(alpha: 0.85),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '${session.time}   ${session.source}',
                          style: GoogleFonts.poppins(
                            fontSize: 9,
                            color: AppColors.grey,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (expanded) ...[
                const SizedBox(height: 10),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Tracked Objects',
                    style: GoogleFonts.poppins(
                      fontSize: 10,
                      color: AppColors.grey,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: session.trackedObjects.map((item) {
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                        color: Colors.white.withValues(alpha: 0.04),
                      ),
                      child: Text(
                        item,
                        style: GoogleFonts.poppins(
                          fontSize: 9,
                          color: AppColors.white.withValues(alpha: 0.9),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _VlmQueryCard extends StatelessWidget {
  const _VlmQueryCard({
    required this.query,
    required this.expanded,
    required this.onTap,
  });

  final VlmQueryRecord query;
  final bool expanded;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            color: Colors.white.withValues(alpha: 0.03),
            border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.chat_bubble_outline_rounded, size: 14, color: AppColors.primary),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      query.prompt,
                      maxLines: expanded ? 3 : 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.poppins(
                        fontSize: 10,
                        color: AppColors.white,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    query.time,
                    style: GoogleFonts.poppins(
                      fontSize: 9,
                      color: AppColors.grey,
                    ),
                  ),
                ],
              ),
              if (expanded) ...[
                const SizedBox(height: 8),
                Text(
                  query.result,
                  style: GoogleFonts.poppins(
                    fontSize: 10,
                    color: AppColors.mutedWhite,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
    required this.icon,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(999),
          color: selected
              ? AppColors.primary.withValues(alpha: 0.16)
              : Colors.white.withValues(alpha: 0.04),
          border: Border.all(
            color: selected ? AppColors.primary : Colors.white.withValues(alpha: 0.10),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 12, color: selected ? AppColors.primary : AppColors.mutedWhite),
            const SizedBox(width: 4),
            Text(
              label,
              style: GoogleFonts.poppins(
                fontSize: 10,
                color: selected ? AppColors.primary : AppColors.mutedWhite,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
