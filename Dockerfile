FROM btwiuse/arch:bun

ADD . /app

WORKDIR /app

RUN bun upgrade

RUN bun install:all

CMD bun dev
