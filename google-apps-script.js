// ================================================
// GOOGLE APPS SCRIPT - Lic Manene
// ================================================

var CORREO_MANENE = 'asesoriaslicmanene@gmail.com';

function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const data = JSON.parse(e.postData.contents);

    if (data.accion === 'crear_preferencia_mp') {
      output.setContent(JSON.stringify(crearPreferenciaMP(data)));
      return output;
    }
    if (data.accion === 'verificar_pago_mp') {
      output.setContent(JSON.stringify(verificarPagoMP(data)));
      return output;
    }

    const inicio = new Date(data.fecha);
    const fin = new Date(inicio.getTime() + 50 * 60 * 1000);

    // Bloqueo manual
    if (data.cliente === 'BLOQUEO MANUAL') {
      const cal = CalendarApp.getDefaultCalendar();
      const ev = cal.createEvent('BLOQUEADO', inicio, fin, {
        description: 'Horario bloqueado manualmente.'
      });
      output.setContent(JSON.stringify({ success: true, eventId: ev.getId() }));
      return output;
    }

    const resultado = crearCitaCalendario(data);
    output.setContent(JSON.stringify({ success: true, eventId: resultado.eventId, meetLink: resultado.meetLink }));
  } catch (err) {
    output.setContent(JSON.stringify({ success: false, error: err.toString() }));
  }

  return output;
}

// Crea el evento de calendario (con Meet) y envia los correos de confirmacion.
// Reutilizada tanto por el flujo legado como por la verificacion de pagos de Mercado Pago.
function crearCitaCalendario(data) {
  const inicio = new Date(data.fecha);
  const fin = new Date(inicio.getTime() + 50 * 60 * 1000);
  const titulo = 'Asesoria: ' + data.cliente;
  let meetLink = '';
  let eventId = '';

  // Crear evento con Google Meet
  try {
    const attendees = [];
    if (data.correo) attendees.push({ email: data.correo });

    const event = {
      summary: titulo,
      description: 'Cliente: ' + data.cliente + '\nContacto: ' + data.contacto + '\nPago ID: ' + data.pagoId,
      start: { dateTime: inicio.toISOString(), timeZone: 'America/Mexico_City' },
      end:   { dateTime: fin.toISOString(),    timeZone: 'America/Mexico_City' },
      attendees: attendees,
      conferenceData: {
        createRequest: {
          requestId: 'meet-' + Date.now(),
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };

    const createdEvent = Calendar.Events.insert(event, 'primary', { conferenceDataVersion: 1 });
    eventId = createdEvent.id || '';

    meetLink = createdEvent.hangoutLink || '';
    if (!meetLink && createdEvent.conferenceData && createdEvent.conferenceData.entryPoints) {
      const videoEntry = createdEvent.conferenceData.entryPoints.find(function(ep) {
        return ep.entryPointType === 'video';
      });
      if (videoEntry) meetLink = videoEntry.uri || '';
    }

  } catch (meetErr) {
    Logger.log('Error Meet: ' + meetErr.toString());
    const cal = CalendarApp.getDefaultCalendar();
    const ev = cal.createEvent(titulo, inicio, fin, {
      description: 'Cliente: ' + data.cliente + '\nContacto: ' + data.contacto
    });
    eventId = ev.getId();
  }

  if (data.correo) {
    const fechaFormato = inicio.toLocaleString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City'
    });

    const meetSeccionHTML = meetLink
      ? '<div style="margin:15px 0;padding:15px;background:#0f2a0f;border-left:4px solid #34d399;border-radius:6px;">' +
        '<p style="margin:0 0 8px 0;font-weight:bold;color:#34d399;">Link de Google Meet:</p>' +
        '<a href="' + meetLink + '" style="color:#d4af37;font-size:1.05rem;word-break:break-all;">' + meetLink + '</a>' +
        '</div>'
      : '<p style="color:#aaa;">El link de videollamada sera enviado por WhatsApp antes de la cita.</p>';

    const htmlCorreo =
      '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0c0b0a;color:#f8f8f8;padding:30px;border-radius:12px;">' +
      '<h2 style="color:#d4af37;margin-top:0;">Tu Asesoria esta Confirmada</h2>' +
      '<p>Hola <strong>' + data.cliente + '</strong>,</p>' +
      '<p>Tu asesoria legal ha sido agendada exitosamente.</p>' +
      '<div style="background:#1a1a1a;border:1px solid #d4af37;border-radius:8px;padding:20px;margin:20px 0;">' +
      '<p style="margin:0 0 10px 0;"><strong>Fecha:</strong> ' + fechaFormato + '</p>' +
      '<p style="margin:0 0 10px 0;"><strong>Duracion:</strong> 50 minutos</p>' +
      meetSeccionHTML +
      '</div>' +
      '<p>Unete a la videollamada en el horario agendado haciendo clic en el enlace de arriba.</p>' +
      '<p style="color:#aaa;font-size:0.85rem;">Si tienes alguna pregunta, contactanos por WhatsApp.</p>' +
      '<hr style="border:none;border-top:1px solid #333;margin:20px 0;">' +
      '<p style="color:#d4af37;font-weight:bold;margin:0;">Lic. Manene Diaz</p>' +
      '<p style="color:#888;font-size:0.8rem;margin:4px 0 0 0;">Asesoria Legal Profesional</p>' +
      '</div>';

    // Correo al cliente. La cita y el pago ya estan confirmados en este punto,
    // asi que un correo invalido no debe tumbar la respuesta ni bloquear la reserva.
    try {
      GmailApp.sendEmail(
        data.correo,
        'Confirmacion de Asesoria - Lic. Manene',
        'Tu asesoria del ' + fechaFormato + ' ha sido confirmada. Duracion: 50 minutos.' + (meetLink ? ' Meet: ' + meetLink : ''),
        { htmlBody: htmlCorreo }
      );
    } catch (mailErr) {
      Logger.log('Error enviando correo al cliente (' + data.correo + '): ' + mailErr.toString());
    }

    // Notificacion a Manene
    try {
      GmailApp.sendEmail(
        CORREO_MANENE,
        'Nueva Cita Agendada: ' + data.cliente,
        'Nueva cita agendada.\nCliente: ' + data.cliente + '\nContacto: ' + data.contacto + '\nFecha: ' + fechaFormato + (meetLink ? '\nMeet: ' + meetLink : ''),
        {
          htmlBody:
            '<div style="font-family:Arial,sans-serif;max-width:600px;background:#fff;padding:20px;border-radius:8px;">' +
            '<h2 style="color:#d4af37;">Nueva Cita Agendada</h2>' +
            '<p><strong>Cliente:</strong> ' + data.cliente + '</p>' +
            '<p><strong>Contacto:</strong> ' + data.contacto + '</p>' +
            '<p><strong>Correo:</strong> ' + data.correo + '</p>' +
            '<p><strong>Fecha:</strong> ' + fechaFormato + '</p>' +
            '<p><strong>Duracion:</strong> 50 minutos</p>' +
            (meetLink ? '<p><strong>Google Meet:</strong> <a href="' + meetLink + '">' + meetLink + '</a></p>' : '') +
            '</div>'
        }
      );
    } catch (mailErr) {
      Logger.log('Error enviando notificacion al despacho: ' + mailErr.toString());
    }
  }

  return { eventId: eventId, meetLink: meetLink };
}

// ================================================
// MERCADO PAGO
// ================================================
// Requiere configurar la propiedad de script MP_ACCESS_TOKEN:
// Editor de Apps Script -> Configuracion del proyecto -> Propiedades del script.

function crearPreferenciaMP(data) {
  const accessToken = PropertiesService.getScriptProperties().getProperty('MP_ACCESS_TOKEN');
  if (!accessToken) {
    return { success: false, error: 'Falta configurar MP_ACCESS_TOKEN en las propiedades del script.' };
  }

  const referencia = {
    n: data.cliente,
    c: data.contacto,
    e: data.correo || '',
    f: data.fecha
  };
  const externalReference = Utilities.base64EncodeWebSafe(JSON.stringify(referencia));
  const baseUrl = (data.baseUrl || '').replace(/\/$/, '');

  const preferencia = {
    items: [{
      title: 'Asesoria Legal - Lic Manene',
      quantity: 1,
      currency_id: 'MXN',
      unit_price: 900
    }],
    payer: {
      name: data.cliente,
      email: data.correo || undefined
    },
    external_reference: externalReference,
    back_urls: {
      success: baseUrl + '/mercadopago-retorno.html',
      pending: baseUrl + '/mercadopago-retorno.html',
      failure: baseUrl + '/mercadopago-retorno.html'
    },
    auto_return: 'approved',
    statement_descriptor: 'LIC MANENE'
  };

  const response = UrlFetchApp.fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + accessToken },
    payload: JSON.stringify(preferencia),
    muteHttpExceptions: true
  });

  const resultado = JSON.parse(response.getContentText());
  if (resultado.id) {
    return { success: true, preferenceId: resultado.id, initPoint: resultado.init_point };
  }
  return { success: false, error: resultado.message || 'Error creando la preferencia de pago.' };
}

function verificarPagoMP(data) {
  const accessToken = PropertiesService.getScriptProperties().getProperty('MP_ACCESS_TOKEN');
  if (!accessToken) {
    return { success: false, error: 'Falta configurar MP_ACCESS_TOKEN en las propiedades del script.' };
  }
  const paymentId = data.paymentId;
  if (!paymentId) {
    return { success: false, error: 'Falta el paymentId.' };
  }

  // Idempotencia: si este pago ya fue procesado, regresa el mismo resultado sin duplicar la cita.
  const cache = CacheService.getScriptCache();
  const cacheKey = 'mp_pago_' + paymentId;
  const cacheado = cache.get(cacheKey);
  if (cacheado) return JSON.parse(cacheado);

  const response = UrlFetchApp.fetch('https://api.mercadopago.com/v1/payments/' + paymentId, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + accessToken },
    muteHttpExceptions: true
  });
  const pago = JSON.parse(response.getContentText());

  if (pago.status !== 'approved') {
    return { success: false, error: 'El pago no esta aprobado. Estado: ' + pago.status };
  }

  let referencia;
  try {
    referencia = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(pago.external_reference)).getDataAsString());
  } catch (e) {
    return { success: false, error: 'No se pudo leer la referencia de la cita.' };
  }

  const citaData = {
    cliente: referencia.n,
    contacto: referencia.c,
    correo: referencia.e,
    fecha: referencia.f,
    pagoId: paymentId
  };

  const creada = crearCitaCalendario(citaData);
  const resultado = {
    success: true,
    eventId: creada.eventId,
    meetLink: creada.meetLink,
    cliente: citaData.cliente,
    contacto: citaData.contacto,
    correo: citaData.correo,
    fecha: citaData.fecha,
    monto: pago.transaction_amount
  };

  cache.put(cacheKey, JSON.stringify(resultado), 21600); // 6 horas
  return resultado;
}

function doGet(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const calendar = CalendarApp.getDefaultCalendar();
    const ahora = new Date();
    const enUnMes = new Date(ahora.getTime() + 60 * 24 * 60 * 60 * 1000);

    const eventos = calendar.getEvents(ahora, enUnMes).map(ev => ({
      id: ev.getId(),
      title: ev.getTitle(),
      start: ev.getStartTime().toISOString(),
      end: ev.getEndTime().toISOString(),
      backgroundColor: ev.getTitle().includes('BLOQUEADO') ? '#4b4b4b' : '#d4af37',
      borderColor: 'transparent',
      textColor: '#000'
    }));

    output.setContent(JSON.stringify(eventos));
  } catch (err) {
    output.setContent(JSON.stringify({ error: err.toString() }));
  }

  return output;
}

function testCrearPreferenciaMP() {
  const resultado = crearPreferenciaMP({
    cliente: 'Cliente Prueba',
    contacto: '5512345678',
    correo: '',
    fecha: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    baseUrl: 'https://example.com'
  });
  Logger.log(JSON.stringify(resultado));
}

function testEnviarCorreo() {
  const payload = {
    postData: {
      contents: JSON.stringify({
        cliente: 'Prueba Test',
        contacto: '5512345678',
        correo: Session.getActiveUser().getEmail(),
        fecha: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        pagoId: 'TEST_MANUAL_' + Date.now()
      })
    }
  };
  const result = doPost(payload);
  Logger.log(result.getContent());
}
