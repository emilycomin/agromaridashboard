import { useState, useRef } from 'react';
import { Avatar, Menu, Modal, TextInput, Button, Stack, Group, Text, Divider } from '@mantine/core';
import { updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { uploadAttachment } from '../services/storage';

export default function UserMenu({ user, onLogout }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [displayName,  setDisplayName]  = useState(user?.displayName ?? '');
  const [saving,       setSaving]       = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [photoURL,     setPhotoURL]     = useState(user?.photoURL ?? null);
  const fileInputRef = useRef(null);

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0]?.toUpperCase() ?? '?');

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    setUploading(true);
    try {
      const url = await uploadAttachment(`avatars/${auth.currentUser.uid}`, file);
      await updateProfile(auth.currentUser, { photoURL: url });
      setPhotoURL(url);
    } catch (err) {
      console.error('Erro ao atualizar foto:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSaveSettings = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      setSettingsOpen(false);
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
    } finally {
      setSaving(false);
    }
  };

  const openSettings = () => {
    setDisplayName(auth.currentUser?.displayName ?? '');
    setSettingsOpen(true);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handlePhotoChange}
      />

      <Menu shadow="md" width={230} position="bottom-start">
        <Menu.Target>
          <Avatar
            src={photoURL}
            radius="xl"
            size={42}
            color="violet"
            style={{
              cursor: 'pointer',
              border: '2px solid rgba(255,255,255,0.7)',
              flexShrink: 0,
            }}
          >
            {initials}
          </Avatar>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>
            <Text fw={700} size="sm" truncate>{user?.displayName || 'Usuário'}</Text>
            <Text size="xs" c="dimmed" truncate>{user?.email}</Text>
          </Menu.Label>

          <Divider my={4} />

          <Menu.Item
            leftSection={<span>📷</span>}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Enviando foto…' : 'Trocar foto de perfil'}
          </Menu.Item>

          <Menu.Item
            leftSection={<span>⚙️</span>}
            onClick={openSettings}
          >
            Configurações da conta
          </Menu.Item>

          <Divider my={4} />

          <Menu.Item
            color="red"
            leftSection={<span>🚪</span>}
            onClick={onLogout}
          >
            Sair
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Modal
        opened={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Configurações da conta"
        centered
        size="sm"
      >
        <Stack gap="md">
          <Group justify="center">
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Avatar src={photoURL} radius="xl" size={80} color="violet">
                {initials}
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  background: '#4338CA', border: 'none', borderRadius: '50%',
                  width: 26, height: 26, cursor: 'pointer', color: '#fff',
                  fontSize: 13, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }}
                title="Trocar foto"
              >
                ✏️
              </button>
            </div>
          </Group>

          <TextInput
            label="Nome de exibição"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Seu nome"
          />

          <TextInput
            label="E-mail"
            value={user?.email ?? ''}
            disabled
            description="O e-mail não pode ser alterado por aqui."
          />

          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" onClick={() => setSettingsOpen(false)}>
              Cancelar
            </Button>
            <Button loading={saving} onClick={handleSaveSettings}>
              Salvar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
