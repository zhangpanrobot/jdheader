const download = require('image-downloader')
const path = require('path')
const puppeteer = require('puppeteer')
const host = 'https://wx.qq.com'

let metaData = require('./metaData')

const imgOptions = {
  url: 'https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxgeticon?username=',
  dest: path.resolve('src/', 'assets')
}

let currentBrowser
let currentPage
let userData

puppeteer.launch({
  headless: false
})
.then(browser => (currentBrowser = browser))
.then(browser => (currentPage = browser.newPage()))
.then(page => {
  currentPage = page
  page.goto(host)
})
.then(() => {
  function delay() {
    return new Promise((resolve) => { 
      setTimeout(getData, 10000)
    })
  }
  function getData() {
    currentPage.evaluate(() => {
      // 打开网页版微信，选中要查看的群，点击群名展开所有人
      let currentContact = angular.element('.members_inner').scope().currentContact
      let list = [].slice.call(currentContact.MemberList, 0).map(item => ({
          UserName: item.UserName,
          DisplayName: item.DisplayName || item.NickName
      }))
      return {
        list: list,
        chatroomid: currentContact.EncryChatRoomId
      }
    }).then((data) => {
      userData = data
      return currentPage.cookies(host)
    }).then((cookies) => {
      const cookieStr = cookies.reduce((pre, val) => `${pre};${val.name}=${val.value}`, '')
      SaveImgsByUser(userData, cookieStr)
    }).then(() => {
      currentBrowser.close()
    })
  }
  delay().then(() => {
    console.log(123456)
  })
})

// UserName, chatroomid, cookie都会动态变更, 使用前需要重新跑src下前端代码
function SaveImgsByUser(data, cookie) {
  data.list.forEach((item) => {
    // 微信名匹配中文名
    let displayName
    metaData.forEach((meta) => {
      if (meta.name.indexOf(item.DisplayName.split('-')[0].trim()) !== -1) {
        displayName = meta.name
      }
    })
    let options = {
      // 未加好友的微图片需要加上chatroomid参数
      url: imgOptions.url + item.UserName + `&chatroomid=${data.chatroomid}&type=big`,
      dest: imgOptions.dest + '/' + (displayName || item.DisplayName) + '.png',
      headers: {
        Cookie: cookie
      }
    }
    download.image(options)
    .then(({ filename, image }) => {
      console.log('File saved to', filename)
    })
    .catch((err) => {
      console.error(err)
    })
  })
}
