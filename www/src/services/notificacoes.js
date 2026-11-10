
import { LocalNotifications } from '@capacitor/local-notifications';

// Solicita autorização para exibir notificações
export async function solicitarPermissao() {
  let status = await LocalNotifications.checkPermissions();

  if (status.display !== 'granted') {
    status = await LocalNotifications.requestPermissions();
  }

  return status.display === 'granted';
}

// Envia uma notificação imediatamente
export async function dispararNotificacaoImediata() {
  await LocalNotifications.schedule({
    notifications: [
      {
        title: 'Food Truck Fiscal 🍔',
        body: 'Não se esqueça de organizar seus comprovantes fiscais!',
        id: 1,
        extra: {
          tipo: 'lembrete-imediato'
        }
      }
    ]
  });
}

// Agenda uma notificação para daqui a alguns segundos
export async function agendarLembrete(segundos = 10) {
  const horario = new Date(Date.now() + segundos * 1000);

  await LocalNotifications.schedule({
    notifications: [
      {
        title: 'Food Truck Fiscal ⏰',
        body: 'Está na hora de conferir seus registros fiscais!',
        id: 42,
        schedule: {
          at: horario
        },
        extra: {
          tipo: 'lembrete-agendado'
        }
      }
    ]
  });

  return horario;
}

// Consulta as notificações que ainda estão agendadas
export async function consultarPendentes() {
  const resultado = await LocalNotifications.getPending();

  return resultado.notifications;
}

// Cancela o lembrete agendado com ID 42
export async function cancelarLembrete() {
  await LocalNotifications.cancel({
    notifications: [
      {
        id: 42
      }
    ]
  });
}
