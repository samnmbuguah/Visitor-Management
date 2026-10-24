'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Container,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  QrCode as QrCodeIcon,
  Security as SecurityIcon,
  LocationOn as LocationIcon,
  Notifications as NotificationsIcon,
  BarChart as BarChartIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Badge as BadgeIcon,
  MeetingRoom as MeetingRoomIcon,
} from '@mui/icons-material';

export default function Navigation() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  if (!user) return null;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: DashboardIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    { href: '/receptionist', label: 'Receptionist', icon: BadgeIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'] },
    { href: '/host', label: 'Host Portal', icon: PeopleIcon, roles: ['SUPER_ADMIN', 'HOST'] },
    { href: '/admin/invites', label: 'Invites', icon: QrCodeIcon, roles: ['SUPER_ADMIN', 'ADMIN'] },
    { href: '/admin/watchlist', label: 'Watchlist', icon: SecurityIcon, roles: ['SUPER_ADMIN', 'ADMIN'] },
    { href: '/admin/locations', label: 'Locations', icon: LocationIcon, roles: ['SUPER_ADMIN', 'ADMIN'] },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChartIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    { href: '/admin/notifications', label: 'Notifications', icon: NotificationsIcon, roles: ['SUPER_ADMIN', 'ADMIN'] },
    { href: '/admin/cctv', label: 'CCTV', icon: SecurityIcon, roles: ['SUPER_ADMIN', 'ADMIN'] },
    { href: '/admin/tenants', label: 'Tenants', icon: BusinessIcon, roles: ['SUPER_ADMIN'] },
    { href: '/profile', label: 'Profile', icon: PersonIcon, roles: ['SUPER_ADMIN', 'ADMIN', 'HOST', 'RECEPTIONIST', 'MANAGER'] },
  ];

  const filteredItems = navItems.filter((item) => item.roles.includes(user.role));

  const drawerContent = (
    <Box sx={{ width: 280, p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 2 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontWeight: 700 }}>V</Avatar>
        <Box>
          <Typography variant="subtitle1" sx={{ lineHeight: 1.2, fontWeight: 700 }}>
            Vizmo
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Visitor Management
          </Typography>
        </Box>
      </Box>
      <Divider sx={{ my: 1 }} />
      <List>
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                selected={isActive}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': { bgcolor: 'primary.dark' },
                    '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isActive ? 'inherit' : 'text.secondary' }}>
                  <Icon />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{
                    primary: {
                      sx: { fontWeight: isActive ? 700 : 500, fontSize: '0.9rem' },
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" sx={{fontWeight: 600}}>
          {user.username}
        </Typography>
        <Chip label={user.role} size="small" color="primary" variant="outlined" sx={{ mt: 0.5, mb: 2 }} />
        <Button
          fullWidth
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={logout}
          size="small"
        >
          Sign Out
        </Button>
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between', minHeight: 64 }}>
            {/* Logo */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: 2.5,
                    background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: '1.1rem',
                  }}
                >
                  V
                </Box>
                <Box>
                  <Typography variant="h6" color="text.primary" sx={{lineHeight: 1.1, fontWeight: 800}}>
                    Vizmo
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 600 }}>
                    Visitor Management
                  </Typography>
                </Box>
              </Link>

              {/* Desktop Nav Items */}
              {!isMobile && (
                <Box sx={{ display: 'flex', gap: 0.5, ml: 2 }}>
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Button
                        key={item.href}
                        component={Link}
                        href={item.href}
                        startIcon={<Icon fontSize="small" />}
                        sx={{
                          fontSize: '0.85rem',
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? 'primary.main' : 'text.secondary',
                          bgcolor: isActive ? 'action.selected' : 'transparent',
                          px: 1.5,
                          py: 0.75,
                          '&:hover': {
                            bgcolor: 'action.hover',
                            color: 'text.primary',
                          },
                        }}
                      >
                        {item.label}
                      </Button>
                    );
                  })}
                </Box>
              )}
            </Box>

            {/* User Profile & Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.2, fontWeight: 700 }}>
                  {user.username}
                </Typography>
                <Typography variant="caption" color="primary.main" sx={{fontWeight: 600, textTransform: 'uppercase'}}>
                  {user.role}
                </Typography>
              </Box>

              <IconButton onClick={handleUserMenuOpen} size="small" sx={{ p: 0.5 }}>
                <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.light', fontSize: '0.9rem', fontWeight: 700 }}>
                  {user.username.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleUserMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                slotProps={{
                  paper: {
                    sx: { mt: 1, minWidth: 180, borderRadius: 2 },
                  },
                }}
              >
                <MenuItem component={Link} href="/profile" onClick={handleUserMenuClose}>
                  <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                  Profile
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => { handleUserMenuClose(); logout(); }} sx={{ color: 'error.main' }}>
                  <ListItemIcon sx={{ color: 'error.main' }}><LogoutIcon fontSize="small" /></ListItemIcon>
                  Sign Out
                </MenuItem>
              </Menu>

              {isMobile && (
                <IconButton onClick={handleDrawerToggle} color="inherit">
                  <MenuIcon />
                </IconButton>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}
