// ================================================
// GOOGLE APPS SCRIPT - Lic Manene
// REQUIERE: Services → Google Calendar API (Calendar)
// ================================================

var CORREO_MANENE = 'asesoriaslicmanene@gmail.com';

function doPost(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    var data = JSON.parse(e.postData.contents);

    if (data.accion === 'crear_preferencia_mp') {
      output.setContent(JSON.stringify(crearPreferenciaMP(data)));
      return output;
    }
    if (data.accion === 'verificar_pago_mp') {
      output.setContent(JSON.stringify(verificarPagoMP(data)));
      return output;
    }

    var inicio = new Date(data.fecha);
    var fin = new Date(inicio.getTime() + 50 * 60 * 1000); // 50 minutos

    // Bloqueo manual
    if (data.cliente === 'BLOQUEO MANUAL') {
      var cal = CalendarApp.getDefaultCalendar();
      var ev = cal.createEvent('BLOQUEADO', inicio, fin, {
        description: 'Horario bloqueado manualmente.'
      });
      output.setContent(JSON.stringify({ success: true, eventId: ev.getId() }));
      return output;
    }

    var creada = crearCitaCalendario(data);
    output.setContent(JSON.stringify({ success: true, eventId: creada.eventId, meetLink: creada.meetLink }));

  } catch (err) {
    Logger.log('ERROR: ' + err.toString());
    output.setContent(JSON.stringify({ success: false, error: err.toString() }));
  }

  return output;
}

// Crea el evento de calendario (con Meet) y envia los correos de confirmacion.
// Reutilizada tanto por el flujo legado como por la verificacion de pagos de Mercado Pago.
function crearCitaCalendario(data) {
  var inicio = new Date(data.fecha);
  var fin = new Date(inicio.getTime() + 50 * 60 * 1000);

  // ── Crear evento con Google Meet ──────────────────────────────
  var attendees = [];
  if (data.correo) attendees.push({ email: data.correo });

  var eventBody = {
    summary: 'Asesoria: ' + data.cliente,
    description: 'Cliente: ' + data.cliente + '\nContacto: ' + data.contacto + '\nPago ID: ' + (data.pagoId || 'N/A'),
    start: { dateTime: inicio.toISOString(), timeZone: 'America/Mexico_City' },
    end:   { dateTime: fin.toISOString(),    timeZone: 'America/Mexico_City' },
    attendees: attendees,
    conferenceData: {
      createRequest: {
        requestId: 'meet-' + Utilities.getUuid(),
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    }
  };

  // Usar Calendar API avanzada (requiere Service habilitado)
  var createdEvent = Calendar.Events.insert(eventBody, 'primary', { conferenceDataVersion: 1 });

  var eventId  = createdEvent.id || '';
  var meetLink = '';

  // Extraer link de Meet
  if (createdEvent.hangoutLink) {
    meetLink = createdEvent.hangoutLink;
  } else if (createdEvent.conferenceData && createdEvent.conferenceData.entryPoints) {
    var videoEP = createdEvent.conferenceData.entryPoints.filter(function(ep) {
      return ep.entryPointType === 'video';
    });
    if (videoEP.length > 0) meetLink = videoEP[0].uri;
  }

  // ── Enviar correos ────────────────────────────────────────────
  if (data.correo) {
    var fechaFormato = inicio.toLocaleString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City'
    });

    var meetHTML = meetLink
      ? '<div style="margin:15px 0;padding:15px;background:#0f2a0f;border-left:4px solid #34d399;border-radius:6px;">' +
        '<p style="margin:0 0 8px 0;font-weight:bold;color:#34d399;">Link de Google Meet:</p>' +
        '<a href="' + meetLink + '" style="color:#d4af37;font-size:1.05rem;">' + meetLink + '</a>' +
        '</div>'
      : '<p style="color:#aaa;">El link de videollamada sera enviado por WhatsApp.</p>';

    // Correo al cliente
    GmailApp.sendEmail(
      data.correo,
      'Confirmacion de Asesoria - Lic. Manene',
      'Asesoria confirmada para el ' + fechaFormato + (meetLink ? '. Meet: ' + meetLink : ''),
      {
        htmlBody:
          '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0c0b0a;color:#f8f8f8;padding:30px;border-radius:12px;">' +
          '<h2 style="color:#d4af37;margin-top:0;">Tu Asesoria esta Confirmada</h2>' +
          '<p>Hola <strong>' + data.cliente + '</strong>,</p>' +
          '<p>Tu asesoria legal ha sido agendada exitosamente.</p>' +
          '<div style="background:#1a1a1a;border:1px solid #d4af37;border-radius:8px;padding:20px;margin:20px 0;">' +
          '<p><strong>Fecha:</strong> ' + fechaFormato + '</p>' +
          '<p><strong>Duracion:</strong> 50 minutos</p>' +
          meetHTML +
          '</div>' +
          '<p style="color:#aaa;font-size:0.85rem;">Cualquier duda, contactanos por WhatsApp.</p>' +
          '<hr style="border:none;border-top:1px solid #333;margin:20px 0;">' +
          '<p style="color:#d4af37;font-weight:bold;margin:0;">Lic. Manene Diaz</p>' +
          '<p style="color:#888;font-size:0.8rem;">Asesoria Legal Profesional</p>' +
          '</div>'
      }
    );

    // Notificacion a Manene
    GmailApp.sendEmail(
      CORREO_MANENE,
      'Nueva Cita: ' + data.cliente,
      'Cliente: ' + data.cliente + '\nFecha: ' + fechaFormato + (meetLink ? '\nMeet: ' + meetLink : ''),
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
  }

  return { eventId: eventId, meetLink: meetLink };
}

// ================================================
// MERCADO PAGO
// ================================================
// Requiere configurar la propiedad de script MP_ACCESS_TOKEN:
// Editor de Apps Script -> Configuracion del proyecto -> Propiedades del script.

function crearPreferenciaMP(data) {
  var accessToken = PropertiesService.getScriptProperties().getProperty('MP_ACCESS_TOKEN');
  if (!accessToken) {
    return { success: false, error: 'Falta configurar MP_ACCESS_TOKEN en las propiedades del script.' };
  }

  var referencia = {
    n: data.cliente,
    c: data.contacto,
    e: data.correo || '',
    f: data.fecha
  };
  var externalReference = Utilities.base64EncodeWebSafe(JSON.stringify(referencia));
  var baseUrl = (data.baseUrl || '').replace(/\/$/, '');

  var preferencia = {
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

  var response = UrlFetchApp.fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + accessToken },
    payload: JSON.stringify(preferencia),
    muteHttpExceptions: true
  });

  var resultado = JSON.parse(response.getContentText());
  if (resultado.id) {
    return { success: true, preferenceId: resultado.id, initPoint: resultado.init_point };
  }
  return { success: false, error: resultado.message || 'Error creando la preferencia de pago.' };
}

function verificarPagoMP(data) {
  var accessToken = PropertiesService.getScriptProperties().getProperty('MP_ACCESS_TOKEN');
  if (!accessToken) {
    return { success: false, error: 'Falta configurar MP_ACCESS_TOKEN en las propiedades del script.' };
  }
  var paymentId = data.paymentId;
  if (!paymentId) {
    return { success: false, error: 'Falta el paymentId.' };
  }

  // Idempotencia: si este pago ya fue procesado, regresa el mismo resultado sin duplicar la cita.
  var cache = CacheService.getScriptCache();
  var cacheKey = 'mp_pago_' + paymentId;
  var cacheado = cache.get(cacheKey);
  if (cacheado) return JSON.parse(cacheado);

  var response = UrlFetchApp.fetch('https://api.mercadopago.com/v1/payments/' + paymentId, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + accessToken },
    muteHttpExceptions: true
  });
  var pago = JSON.parse(response.getContentText());

  if (pago.status !== 'approved') {
    return { success: false, error: 'El pago no esta aprobado. Estado: ' + pago.status };
  }

  var referencia;
  try {
    referencia = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(pago.external_reference)).getDataAsString());
  } catch (e) {
    return { success: false, error: 'No se pudo leer la referencia de la cita.' };
  }

  var citaData = {
    cliente: referencia.n,
    contacto: referencia.c,
    correo: referencia.e,
    fecha: referencia.f,
    pagoId: paymentId
  };

  var creada = crearCitaCalendario(citaData);
  var resultado = {
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

// ── GET: retorna eventos del calendario ───────────────────────────
function doGet(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    var calendar = CalendarApp.getDefaultCalendar();
    var ahora    = new Date();
    var enUnMes  = new Date(ahora.getTime() + 60 * 24 * 60 * 60 * 1000);

    var eventos = calendar.getEvents(ahora, enUnMes).map(function(ev) {
      return {
        id: ev.getId(),
        title: ev.getTitle(),
        start: ev.getStartTime().toISOString(),
        end:   ev.getEndTime().toISOString(),
        backgroundColor: ev.getTitle().indexOf('BLOQUEADO') !== -1 ? '#4b4b4b' : '#d4af37',
        borderColor: 'transparent',
        textColor: '#000'
      };
    });

    output.setContent(JSON.stringify(eventos));
  } catch (err) {
    output.setContent(JSON.stringify({ error: err.toString() }));
  }

  return output;
}

function testCrearPreferenciaMP() {
  var resultado = crearPreferenciaMP({
    cliente: 'Cliente Prueba',
    contacto: '5512345678',
    correo: '',
    fecha: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    baseUrl: 'https://example.com'
  });
  Logger.log(JSON.stringify(resultado));
}

// ── TEST manual ───────────────────────────────────────────────────
function testCrearCita() {
  var payload = {
    postData: {
      contents: JSON.stringify({
        cliente:   'Cliente Prueba',
        contacto:  '5512345678',
        correo:    Session.getActiveUser().getEmail(),
        fecha:     new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        pagoId:    'TEST_' + Date.now()
      })
    }
  };
  var result = doPost(payload);
  Logger.log(result.getContent());
}
