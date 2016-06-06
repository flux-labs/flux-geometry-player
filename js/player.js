class Player {

  constructor() {
    console.log('hello')
    this.viewport = new FluxViewport(document.querySelector("#view"))
    this.viewport.setupDefaultLighting()
    this.viewport._renderer.setClearColor(0xffffff)
    this.viewport._renderer._helpersScene.remove(this.viewport._renderer._helpers)
    this.queue = []
    this.master = {speed: 0.5, value: 0}
    this.geometry = {}
    this.recordingName = 0
    this.recording = false
    this.group = new THREE.Object3D()
    this.viewport._renderer._scene.add(this.group)
    this.viewport._renderer._model = this.group
    this.rotate = false
  }

  add(name, data, color) {
    console.log('add', color)
    this.geometry[name] = {name: name, data: [], repeat: false, play: false, visible: true, frames: data.length, frame: 0, current: null, value: 0, speed: 0.5, color: color || "#ff0000"}
    if (!this.viewport._geometryBuilder.running) {
      for (var i = 0; i < data.length; i++) {
        data[i].name = name
        this.queue.push(data[i])
      }
      this.convert()
    } else console.log(new Error('Already running. You can only convert one entity at a time.'));
  }
  
  convert() {
    if (this.viewport._geometryBuilder.running) return console.log(new Error('Already running. You can only convert one entity at a time.'));
    if (!this.queue.length) return
    let data = this.queue.shift()
    this.viewport._geometryBuilder.convert(data).then((results) => {
      let mesh = results.getMesh()
      // console.log('mesh', mesh)
      mesh.name = data.name
      let c = new THREE.Color(this.geometry[data.name].color)
      mesh.children[0].material.color = c
      this.geometry[data.name].data.push(mesh)
      if (!this.geometry[data.name].current) {
        this.setFrame(data.name, 0)
        this.viewport.focus()
      }
      this.convert()
    })
  }

  setColor(name, color) {
    let c = new THREE.Color(color)
    this.geometry[name].color = color
    this.geometry[name].data.map((g) => g.children[0].material.color = c)
    this.geometry[name].current.children[0].material.color = c
  }

  play(name) {
    this.geometry[name].play = true
  }

  playAll() {
    for (var k in this.geometry) { this.play(k) }
  }

  stop(name) {
    this.geometry[name].play = false
  }

  stopAll() {
    for (var k in this.geometry) { this.stop(k) }
  }

  setValue(name, value) {
    let g = this.geometry[name]
    g.value = parseFloat(value)
    let frame = Math.round(g.value * (g.frames-1))
    if (frame !== g.frame) this.setFrame(name, frame)
  }

  setValueAll(value) {
    for (var k in this.geometry) { this.setValue(k, value) }
  }

  setSpeed(name, value) {
    this.geometry[name].speed = value
  }

  setSpeedAll(value) {
    for (var k in this.geometry) { this.setSpeed(k, value) }
  }

  show(name) {
    this.geometry[name].visible = true
    this.geometry[name].data.map((g) => g.visible = true)
    this.geometry[name].current.visible = true
  }

  hide(name) {
    this.geometry[name].visible = false
    this.geometry[name].data.map((g) => g.visible = false)
    this.geometry[name].current.visible = false
  }

  toggle(name) {
    if (this.geometry[name].visible) this.hide(name)
    else this.show(name)
  }

  tick(name) {
    let g = this.geometry[name]
    let v = g.value
    g.value = (g.value + (g.speed / 120)) % 1
    let frame = Math.round(g.value * (g.frames-1))
    if (frame !== g.frame) this.setFrame(name, frame)
    $(`.content-${name} .frame`).val(g.value)
  }

  setFrame(name, frame) {
    let current = this.geometry[name].current
    let geometry = this.geometry[name].data[frame]
    this.geometry[name].current = geometry
    this.geometry[name].frame = frame
    if (current) this.group.remove(current)
    this.group.add(geometry)
  }

  remove(name) {
    this.group.remove(this.geometry[name].current)
    delete this.geometry[name]
  }

  removeAll() {
    for (var k in this.geometry) { this.remove(k) }
  }

  render() {
    for (let k in this.geometry) {
      let g = this.geometry[k]
      if (g.visible) {
        if (g.play) this.tick(g.name)
      }
    }

    if (this.rotate) {
      this.group.rotation.z = performance.now() * 0.0002;
      // this.group.rotation.y = timer * 0.0001;
    }
    if (this.recording) this.recorder.capture(this.viewport._renderer.getGlCanvas())
    this.viewport.render()
  }

  startRotating() {
    this.rotate = true
  }

  stopRotating() {
    this.rotate = false
  }

  startRecording() {
    this.recorder = new CCapture( {
      framerate: 60,
      name: 'flux-player-' + (this.recordingName++),
      format: 'webm',
      timeLimit: 60
    }); 
    this.recording = true
    this.recorder.start();
  }

  stopRecording(cb) {
    this.recording = false
    this.recorder.stop()
    this.recorder.save()
  }


}
