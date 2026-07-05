const element = `       <li class="${isOwnMessage ? "message-right" : "message-left"}">
          <p class="message">
            ${data.message}
            <span>${data.name} ● ${moment(data.dateTime).fromNow()}</span>
          </p>
        </li>
        `;
