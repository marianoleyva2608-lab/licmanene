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

    output.setContent(JSON.stringify({ success: true, eventId: eventId, meetLink: meetLink }));

  } catch (err) {
    Logger.log('ERROR: ' + err.toString());
    output.setContent(JSON.stringify({ success: false, error: err.toString() }));
  }

  return output;
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
