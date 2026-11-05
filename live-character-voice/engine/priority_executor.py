"""One-thread priority executor: the "compute lane" for the heavy models (ASR + TTS).

On a 4-vCPU machine, running ASR and TTS at the same time oversubscribes the cores and slows
both (measured in M7). The lane runs one heavy call at a time with all cores, always picking the
OLDEST line first (lowest priority number), so the line closest to its deadline finishes first.
"""

from __future__ import annotations

import heapq
import itertools
import threading
from collections.abc import Callable
from concurrent.futures import Future
from typing import Any, TypeVar

T = TypeVar("T")


class PriorityExecutor:
    def __init__(self, name: str = "lane") -> None:
        self._heap: list[tuple[float, int, Callable[[], Any], Future[Any]]] = []
        self._seq = itertools.count()
        self._cv = threading.Condition()
        self._closed = False
        self._thread = threading.Thread(target=self._loop, name=name, daemon=True)
        self._thread.start()

    def submit(self, priority: float, fn: Callable[[], T]) -> Future[T]:
        fut: Future[T] = Future()
        with self._cv:
            if self._closed:
                raise RuntimeError("executor closed")
            heapq.heappush(self._heap, (priority, next(self._seq), fn, fut))
            self._cv.notify()
        return fut

    def _loop(self) -> None:
        while True:
            with self._cv:
                while not self._heap and not self._closed:
                    self._cv.wait()
                if not self._heap:
                    return
                _, _, fn, fut = heapq.heappop(self._heap)
            if not fut.set_running_or_notify_cancel():
                continue
            try:
                fut.set_result(fn())
            except BaseException as e:
                fut.set_exception(e)

    @property
    def pending(self) -> int:
        with self._cv:
            return len(self._heap)

    def shutdown(self, wait: bool = False) -> None:
        with self._cv:
            self._closed = True
            self._cv.notify_all()
        if wait:
            self._thread.join()
