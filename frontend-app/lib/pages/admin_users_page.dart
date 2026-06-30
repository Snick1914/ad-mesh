import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class AdminUsersPage extends StatefulWidget {
  const AdminUsersPage({super.key});

  @override
  State<AdminUsersPage> createState() => _AdminUsersPageState();
}

class _AdminUsersPageState extends State<AdminUsersPage> {
  List<User> _users = [];
  String _searchQuery = '';
  bool _isLoading = true;

  Future<void> _fetchUsers() async {
    setState(() => _isLoading = true);
    final users = await ApiService.getUsers();
    setState(() {
      _users = users;
      _isLoading = false;
    });
  }

  @override
  void initState() {
    super.initState();
    _fetchUsers();
  }

  void _showEditLimitsDialog(User user) {
    final devicesController = TextEditingController(text: '${user.maxDevices}');
    final storageController = TextEditingController(text: '${user.maxStorageGb.toInt()}');
    bool isSaving = false;

    showDialog(
      context: context,
      builder: (context) {
        const primaryColor = Color(0xFF00F0FF);
        const cardBg = Color(0xFF121824);
        return StatefulBuilder(
          builder: (context, setModalState) {
            return AlertDialog(
              backgroundColor: cardBg,
              title: Text(
                'Ajustar Límites',
                style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.white),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Asigna cuota de pantallas y disco para ${user.fullName}.',
                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    controller: devicesController,
                    keyboardType: TextInputType.number,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(
                      labelText: 'Límite de Pantallas',
                      labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                      enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white24)),
                      focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: primaryColor)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: storageController,
                    keyboardType: TextInputType.number,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(
                      labelText: 'Espacio de Almacenamiento (GB)',
                      labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                      enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white24)),
                      focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: primaryColor)),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancelar', style: TextStyle(color: Colors.white70)),
                ),
                ElevatedButton(
                  onPressed: isSaving
                      ? null
                      : () async {
                          setModalState(() => isSaving = true);
                          final updated = await ApiService.updateUserLimits(
                            user.id,
                            int.tryParse(devicesController.text) ?? user.maxDevices,
                            double.tryParse(storageController.text) ?? user.maxStorageGb,
                          );
                          setModalState(() => isSaving = false);
                          if (mounted) {
                            setState(() {
                              _users = _users.map((u) => u.id == user.id ? updated : u).toList();
                            });
                            Navigator.pop(context);
                          }
                        },
                  style: ElevatedButton.styleFrom(backgroundColor: primaryColor, foregroundColor: Colors.black),
                  child: Text(isSaving ? 'Guardando...' : 'Guardar'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF00F0FF);
    const darkBg = Color(0xFF05070A);
    const cardBg = Color(0xFF121824);

    final isDesktop = MediaQuery.of(context).size.width >= 900;
    final filteredUsers = _users.where((u) {
      final q = _searchQuery.toLowerCase();
      return u.fullName.toLowerCase().contains(q) || u.email.toLowerCase().contains(q);
    }).toList();

    return Scaffold(
      backgroundColor: darkBg,
      appBar: AppBar(
        backgroundColor: cardBg,
        elevation: 0,
        title: Text(
          'Gestión de Clientes',
          style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 16),
        ),
      ),
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isDesktop) SizedBox(width: 260, child: _buildSidebar(context)),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title
                  Text(
                    'Gestión de Clientes',
                    style: GoogleFonts.inter(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Administra accesos, cuotas y soporte en tiempo real.',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: const Color(0xFF94A3B8),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Search Bar
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withOpacity(0.05)),
                    ),
                    child: TextField(
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(
                        icon: Icon(Icons.search, color: Color(0xFF94A3B8)),
                        hintText: 'Buscar por nombre o correo...',
                        hintStyle: TextStyle(color: Color(0xFF94A3B8)),
                        border: InputBorder.none,
                      ),
                      onChanged: (val) {
                        setState(() {
                          _searchQuery = val;
                        });
                      },
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Users List
                  Expanded(
                    child: _isLoading
                        ? const Center(
                            child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation(primaryColor)),
                          )
                        : ListView.separated(
                            itemCount: filteredUsers.length,
                            separatorBuilder: (c, i) => const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final user = filteredUsers[index];
                              return _buildUserCard(user);
                            },
                          ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUserCard(User user) {
    const cardBg = Color(0xFF121824);
    const primaryColor = Color(0xFF00F0FF);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    backgroundColor: Colors.white.withOpacity(0.05),
                    foregroundColor: primaryColor,
                    child: Text(user.fullName.substring(0, 1).toUpperCase()),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user.fullName,
                        style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 15),
                      ),
                      Text(
                        user.email,
                        style: GoogleFonts.robotoMono(color: const Color(0xFF94A3B8), fontSize: 11),
                      ),
                    ],
                  ),
                ],
              ),
              Row(
                children: [
                  // Role Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: user.isSuperuser ? primaryColor.withOpacity(0.1) : Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: user.isSuperuser ? primaryColor.withOpacity(0.2) : Colors.white.withOpacity(0.08),
                      ),
                    ),
                    child: Text(
                      user.isSuperuser ? 'Super Admin' : 'Cliente',
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: user.isSuperuser ? primaryColor : const Color(0xFF94A3B8),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Status Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: user.isActive ? const Color(0xFF10B981).withOpacity(0.1) : Colors.red.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: user.isActive ? const Color(0xFF10B981).withOpacity(0.2) : Colors.red.withOpacity(0.2),
                      ),
                    ),
                    child: Text(
                      user.isActive ? 'Activo' : 'Suspendido',
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: user.isActive ? const Color(0xFF10B981) : Colors.red,
                      ),
                    ),
                  ),
                ],
              )
            ],
          ),
          const SizedBox(height: 16),
          // User quotas summary
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('PANTALLAS MÁX', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 9, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 2),
                      Text('${user.maxDevices}', style: GoogleFonts.robotoMono(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                    ],
                  ),
                  const SizedBox(width: 24),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('DISCO MÁX', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 9, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 2),
                      Text('${user.maxStorageGb.toInt()} GB', style: GoogleFonts.robotoMono(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                    ],
                  ),
                ],
              ),
              // Action Buttons
              Row(
                children: [
                  if (!user.isSuperuser)
                    ElevatedButton.icon(
                      onPressed: () async {
                        final success = await ApiService.impersonateUser(user.id);
                        if (success && mounted) {
                          Navigator.pushNamedAndRemoveUntil(context, '/devices', (route) => false);
                        } else if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('La simulación de soporte solo está disponible con el servidor conectado o modo mock.'),
                              backgroundColor: Colors.redAccent,
                            ),
                          );
                        }
                      },
                      icon: const Icon(Icons.login_rounded, size: 14),
                      label: const Text('Entrar', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00F0FF).withOpacity(0.1),
                        foregroundColor: const Color(0xFF00F0FF),
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                          side: BorderSide(color: const Color(0xFF00F0FF).withOpacity(0.2), width: 1),
                        ),
                      ),
                    ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: () => _showEditLimitsDialog(user),
                    icon: const Icon(Icons.edit_rounded, color: Colors.white70, size: 20),
                    tooltip: 'Ajustar Límites',
                  ),
                  if (!user.isSuperuser)
                    IconButton(
                      onPressed: () async {
                        final updated = await ApiService.toggleUserStatus(user.id, !user.isActive);
                        setState(() {
                          _users = _users.map((u) => u.id == user.id ? updated : u).toList();
                        });
                      },
                      icon: Icon(
                        user.isActive ? Icons.block_flipped : Icons.check_circle_outline_rounded,
                        color: user.isActive ? Colors.redAccent : const Color(0xFF10B981),
                        size: 20,
                      ),
                      tooltip: user.isActive ? 'Suspender Cuenta' : 'Activar Cuenta',
                    ),
                ],
              )
            ],
          )
        ],
      ),
    );
  }

  Widget _buildSidebar(BuildContext context) {
    const cardBg = Color(0xFF121824);
    const primaryColor = Color(0xFF00F0FF);

    return Material(
      color: cardBg,
      child: Column(
        children: [
          const SizedBox(height: 24),
          ListTile(
            leading: const Icon(Icons.dashboard_rounded, color: Color(0xFF94A3B8)),
            title: const Text('Dashboard', style: TextStyle(color: Color(0xFF94A3B8))),
            onTap: () {
              final scaffoldState = Scaffold.maybeOf(context);
              if (scaffoldState != null && scaffoldState.isDrawerOpen) {
                Navigator.pop(context);
              }
              if (Navigator.canPop(context)) {
                Navigator.pop(context);
              }
            },
          ),
          ListTile(
            leading: const Icon(Icons.people_alt_rounded, color: primaryColor),
            title: const Text('Clientes', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            onTap: () {},
          ),
        ],
      ),
    );
  }
}
