let tv, tvframe;
let mobCheck = true;
var optionsTv = {
  id: 384372134,
  width: '100vw',
  loop: true,
  quality: '1080p',
  background: true,
  autoplay: true,
  byline: false,
  title: false,
  fullscreen: true
};
let arrTv = [{
  id: 384372134, time: "15s",
  es: "Chile | Atacama Desert", en: "Chile | Atacama Desert",
},
{
  id: 355317435, time: "0s",
  es: "Chile | Los Lagos to Atacama", en: "Chile | Los Lagos to Atacama"
},
{
  id: 260017598, time: "15s",
  es: "Chile | Patagonia, Torres del Paine", en: "Chile | Patagonia, Torres del Paine"
},
{ id: 389572529, time: "11s", es: "South Pole | Antarctica", en: "South Pole | Antarctica" }];

(function supportVideo() {
  let ua = navigator.userAgent;
  let checker = {
    iphone: ua.match(/(iPhone|iPod|iPad)/),
    blackberry: ua.match(/BlackBerry/),
    android: ua.match(/Android/)
  };
  if (checker.android || checker.iphone) {
    mobCheck = true;
  }
  else {
    (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) mobCheck = true })(navigator.userAgent || navigator.vendor);
  }
  return mobCheck;
})();
function setFrameProperties() {
  getTvFrame();
  tvframe.prop("webkitallowfullscreen", true);
  tvframe.prop("mozallowfullscreen", true);
}

function getTv() {
  tv = tv || new Vimeo.Player('tv', optionsTv);
  return tv;
}
function getTvFrame() {
  tvframe = tvframe || $('.tv .screen iframe');
  return tvframe;
}
function setVideo() {

  let video = arrTv[Math.random() * arrTv.length | 0];
  optionsTv.id = video.id;
  getTv();
  getTvFrame();
  tv.setVolume(0);
  tv.setCurrentTime(video.time);
}
function changeLang() {
  $(".contenido").each(function (index) {
    $(this).text($(this).data(lang));
  });
}


function vidRescale() {
  var w = $(window).width() + 200,
    h = $(window).height() + 200;
  getTv();
  getTvFrame();

  console.log(w, h, tvframe);
  if (w / h > 16 / 9) {
    tvframe.css({ 'width': w, 'height': w / 16 * 9 });
    $('.tv .screen').css({ 'left': '0px', 'width': w + 'px', 'height': w / 16 * 9 + 'px' });
  } else {
    tvframe.css({ 'width': h / 9 * 16, 'height': h });
    $('.tv .screen').css({ 'left': '0px', 'width': h / 9 * 16 + 'px', 'height': h + 'px' });
  }
}
function logError(data) {
  console.log(data.message);
}

$(document).on('ready', function () {

  if (!mobCheck) {
    $('.tv .screen, .cover').addClass('off');
  }

  $('button').on('click', function (e) {
    e.stopPropagation();
    $('button').removeClass('on');
    $(this).toggleClass('on');
    $('.rocks, .info, .tv').addClass('on');
  });

  $('button:first-of-type').on('click', function () {
    $('.info > div').removeClass('on');
    $('.about-us').addClass('on');
  });

  $('button:last-of-type').on('click', function () {
    $('.info > div').removeClass('on');
    $('.contact-us').addClass('on');
  });

  $('.info').on('click', function (e) {
    e.stopPropagation();
  });

  $('html, .info > i').on('click', function () {
    $('button, .rocks, .info, .tv, .about-us, .contact-us').removeClass('on');
  });

  setVideo();

  tv.ready().then(function (e) {
    setFrameProperties();
    vidRescale();
    // console.log('played t the video!');
    // console.log(e);

  }).catch(logError);
  tv.on('play', function (e) {
    // console.log('played the video!');
    // console.log(e);
    $('#tv, .cover').addClass('on');
  });

});

$(window)
  .on('load', function () {
    vidRescale();
    $('.rocks').children().addClass('show');
  })
  .on('resize', function () {
    vidRescale();
  });