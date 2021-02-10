FROM node:latest as build

ARG build_env=somevar
ENV BUILD_ENV=${build_env}
RUN echo "Building dns-scanner docker image in $build_env mode."


COPY . .

RUN npm i
RUN apt update && apt install dnsutils -y

ENV NODE_ENV $build_env
ENV REACT_APP_BUILD_ENV $build_env

RUN ls -lah

ENTRYPOINT ["node", "exec.js"]
CMD [""]
