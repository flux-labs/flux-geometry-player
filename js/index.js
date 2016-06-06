var container, player;
var camera, scene, renderer;
var depthMaterial, effectComposer, depthRenderTarget;
var ssaoPass;
var group;
var depthScale = 1.0;
var postprocessing = { enabled : true, renderMode: 0 }; // renderMode: 0('framebuffer'), 1('onlyAO')
let loading = false;
var projects, selectedProject, projectKeys, selectedKey;
var geometryCount = 0

let colors = {
  red: "#ff0000",
  green: "#00ff00",
  blue: "#0000ff"
}

function randomColor() {
  let k = Object.keys(colors)
  return colors[k[Math.floor(Math.random() * k.length)]]
}

setFluxLogin();

var materials = [
  { name: 'red', diffuse: 'black.jpg' },
  { name: 'black', diffuse: 'red.jpg' },
]

function checkLogin() {
  var credentials = getFluxCredentials();
  if (!credentials) return Promise.reject()
  var user = sdk.getUser(credentials);
  return user.listProjects();
}

function showLogin(err) {
  localStorage.removeItem('fluxCredentials');
  $('#login').show();
  $('#add').hide();
  $('#login button').on('click', getFluxLogin);
}

function fillProjects() {
  $('#projects .menu').empty();
  for (let p of projects) {
    $('#projects .menu').append('<div class="item" value="' + p.id + '" data-id="' + p.id + '">' + p.name + '</div>');
  }
  $('#projects .menu').attr("size", projects.length+1);
  $('#projects').dropdown();
  // $('#projects').change(fillKeys);
  $('#projects .menu .item').click((e) => {
    selectedProject = projects.filter((p) => p.id === $(e.target).data('id'))[0]
    $('#keys').show()
    $('#projects').hide()
    $('#get').show()
    console.log('sel', selectedProject)
    $('#change .label').html(selectedProject.name)
    $('#change').show()
    disableGet()
    fillKeys()
  })
}

function changeProject() {
  $('#keys').hide()
  $('#projects').show()
  $('#change').hide()
  $('#get').hide()
  $('#keys').dropdown('clear')
  $('#projects').dropdown('clear')
  removeAll()
  player.removeAll()
}

function fillKeys() {
  getKeys(selectedProject).then((data) => {
    projectKeys = data.entities
    $('#keys .menu').empty();
    for (let k of projectKeys) {
      $('#keys .menu').append(`<div class="item" value="${k.label}" data-id="${k.id}">${k.label}</div>`);
    }
    $('#keys .menu').attr("size", projectKeys.length+1);
    $('#keys').dropdown();
    $('#keys .menu .item').click((e) => {
      enableGet()
      selectedKey = projectKeys.filter((k) => k.id === $(e.target).data('id'))[0]
    })
  })
}

function extractFromArray(data) {
  if (Array.isArray(data) && Array.isArray(data[0])) return extractFromArray(data[0])
  return data
}

function onError(error) {
  $('#get').attr('data-content', error).popup('show');
}

function getData() {
  if (loading) return onError('Please wait');
  loading = true;
  $('#get').addClass('loading')
       .attr('data-content', 'this might take a bit...')
       // .popup('show');
  if (!selectedProject || !selectedKey) return false
  getValue(selectedProject, selectedKey).then((data) => {
    $('#get').removeClass('loading')
    loading = false
    let geometry = extractFromArray(data.value)
    addGeometry(selectedKey.label, geometry)
  })
}

function initMaster() {
  $('.ui.accordion').accordion('refresh')
  $('.title-master .stop').hide()
  $('.title-master .play').click(() => {
    $('.title .stop').show()
    $('.title .play').hide()
    player.playAll()
  })
  $('.title-master .stop').click(() => {
    $('.title .play').show()
    $('.title .stop').hide()
    player.stopAll()
  })
  $('.title-master .record').click(() => {
    let active = $('.title-master .record').hasClass('active')
    $('.title-master .record').toggleClass('active')
    if (active) player.stopRecording()
    else player.startRecording()
  })
  $('.title-master .backward').click(() => player.setValueAll(0))
  $('.title-master .repeat').click(() => {
    let active = $('.title-master .repeat').hasClass('active')
    $('.title-master .repeat').toggleClass('active')
    if (active) player.stopRotating()
    else player.startRotating()
  })
  $('.content-master .speed').on('input', (e) => player.setSpeedAll(e.target.value))
  $('.content-master .frame').on('input', (e) => player.setValueAll(e.target.value))
}

function addGeometry(name, geometry) {
  showAccordions()
  disableGet()
  $(`#keys .menu .item[value=${name}]`).hide()
  $('#keys').dropdown('clear')
  let c = randomColor()
  player.add(name, geometry, c);
  let tmpl = geometryKey(name)
  $('#geometries .accordion').append(tmpl[0]).append(tmpl[1])
  $('.ui.accordion').accordion('refresh')
  $(`.title-${name} .stop`).hide()
  $(`.title-${name} .hide`).hide()
  $(`.title-${name} .play`).click(onPlay.bind(null, name))
  $(`.title-${name} .stop`).click(onStop.bind(null, name))
  $(`.title-${name} .remove`).click(onRemove.bind(null, name))
  $(`.title-${name} .hide`).click(onShow.bind(null, name))
  $(`.title-${name} .unhide`).click(onHide.bind(null, name))
  $(`.content-${name} .speed`).on('input', onChangeSpeed.bind(null, name))
  $(`.content-${name} .frame`).on('input', onChangeFrame.bind(null, name))
  $(`.title-${name} .color`).minicolors({
    change: onChangeColor.bind(null, name),
    defaultValue: c
  })
  initTooltips()
}

function onChangeColor(name, color) {
 player.setColor(name, color)
}
function onChangeSpeed(name, e) {
  player.setSpeed(name, e.target.value)
}

function onChangeFrame(name, e) {
  player.setValue(name, e.target.value)
}

function onPlay(name) {
  $(`.ui.accordion .title-${name} .play`).hide()
  $(`.ui.accordion .title-${name} .stop`).show()
  player.play(name)
}

function onStop(name) {
  $(`.ui.accordion .title-${name} .stop`).hide()
  $(`.ui.accordion .title-${name} .play`).show()
  player.stop(name)
}

function onShow(name) {
  $(`.ui.accordion .title-${name} .hide`).hide()
  $(`.ui.accordion .title-${name} .unhide`).show()
  player.show(name)
}

function onHide(name) {
  $(`.ui.accordion .title-${name} .hide`).show()
  $(`.ui.accordion .title-${name} .unhide`).hide()
  player.hide(name)
}

function onRemove(name) {
  $(`#keys .menu .item[value=${name}]`).show()
  $(`.ui.accordion .title-${name}`).remove()
  $(`.ui.accordion .content-${name}`).remove()
  player.remove(name)
  if ($('.ui.accordion .title').length === 1) hideAccordions()
}

function removeAll() {
  $('.ui.accordion .title').not('.title-master').remove()
  $('.ui.accordion .content').not('.content-master').remove()
  hideAccordions()
}

function geometryKey(name) {
  return [`
    <div class="title title-${name}">
      <div class="label">
        <i class="dropdown icon"></i> ${name}
      </div>
      <div class="buttons">
        <i class="color" data-content="color">
        </i>
        <i class="play icon" data-content="play"></i>
        <i class="stop icon" data-content="stop"></i>
        <i class="show hide icon" data-content="show"></i>
        <i class="selected unhide icon" data-content="hide"></i>
        <i class="remove icon" data-content="delete"></i>
      </div>
    </div>
  `, `
    <div class="content content-${name}">
      <div class="row">
        <span class="label">Frame</span>
        <input class="frame" type="range" value="0" min="0" max="1" step="0.001"></input>
      </div>
      <div class="row">
        <span class="label">Speed</span>
        <input class="speed" type="range" value="0.5" min="0" max="1" step="0.001"></input>
      </div>
    </div>
  `]
}

function showAccordions() {
  $('#geometries').show()
}
function hideAccordions() {
  $('#geometries').hide()
}

function disableGet() {
  $('#get').addClass('disabled')
}

function enableGet() {
  $('#get').removeClass('disabled')
}

function initTooltips() {
  $('.buttons i').popup({position: 'top center'})
}

function foo() {
  player = new Player();
  initMaster()
  hideAccordions()
  changeProject()
  // initTooltips()
  checkLogin().then(function(data) {
    $('#change .action').click(changeProject)
    $('#login').hide();
    projects = data.entities
    fillProjects();
    $('.ui.accordion').accordion({selector: { trigger: '.title .label' }})
  }).catch(showLogin);

  $('#get').click(getData)
  animate()
}

function animate() {
  requestAnimationFrame( animate );
  player.render()
}

window.onload = foo
